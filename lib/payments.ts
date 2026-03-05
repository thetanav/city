import type Stripe from "stripe";

import { sendTicketConfirmationEmail } from "@/email";
import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/stripe";

type CreatedTicket = {
  tierName: string;
  qty: number;
  unitPrice: number;
};

type TicketCreateStatus =
  | "created"
  | "skipped"
  | "missing_event"
  | "missing_items"
  | "missing_metadata"
  | "insufficient_seats";

export type TicketCreateResult = {
  status: TicketCreateStatus;
  createdTickets: CreatedTicket[];
};

type PriceTier = {
  id?: string;
  name?: string;
  price?: number;
  seats?: number;
  note?: string;
};

function totalSeatsFromPrices(prices: unknown) {
  if (!Array.isArray(prices)) return 0;
  return prices.reduce((sum, tier) => {
    if (!tier || typeof tier !== "object") return sum;
    const seats = Number((tier as { seats?: number }).seats ?? 0);
    return sum + (Number.isFinite(seats) ? seats : 0);
  }, 0);
}

async function ensureSessionWithItems(session: Stripe.Checkout.Session) {
  if (session.line_items) return session;

  return stripeClient.checkout.sessions.retrieve(session.id, {
    expand: ["line_items"],
  });
}

export async function createTicketsFromSession(
  session: Stripe.Checkout.Session,
): Promise<TicketCreateResult> {
  const metadata = session.metadata ?? {};
  const eventId = metadata.eventId;
  const userId = metadata.userId ?? null;

  if (!eventId) {
    return { status: "missing_metadata", createdTickets: [] };
  }

  const fullSession = await ensureSessionWithItems(session);
  const paymentId = fullSession.payment_intent?.toString() ?? null;

  // Idempotency: if tickets already exist for this payment, skip
  if (paymentId) {
    const existing = await prisma.ticket.findFirst({
      where: { paymentId, eventId },
      select: { id: true },
    });

    if (existing) {
      return { status: "skipped", createdTickets: [] };
    }
  }

  const items = (fullSession.line_items?.data ?? []).filter(
    (item) => item.description !== "Service fee",
  );

  if (items.length === 0) {
    return { status: "missing_items", createdTickets: [] };
  }

  // Build qty-per-tier map from Stripe line items
  const qtyByName = new Map<string, number>();
  for (const item of items) {
    const name = item.description ?? "General";
    const qty = item.quantity ?? 1;
    qtyByName.set(name, (qtyByName.get(name) ?? 0) + qty);
  }

  // All ticket creation + seat decrement happens inside a single transaction
  // with a fresh read of the event to avoid race conditions
  const createdTickets: CreatedTicket[] = [];

  const result = await prisma.$transaction(async (tx) => {
    // Read the event inside the transaction for consistency
    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) return "missing_event" as const;

    const tiers: PriceTier[] = Array.isArray(event.prices)
      ? (event.prices as PriceTier[])
      : [];

    // Validate seat availability for every requested tier
    for (const [tierName, requestedQty] of qtyByName) {
      const tier = tiers.find(
        (t) => typeof t.name === "string" && t.name === tierName,
      );
      const available =
        tier && typeof tier.seats === "number" && Number.isFinite(tier.seats)
          ? tier.seats
          : 0;

      if (requestedQty > available) {
        console.error(
          `[payments] Insufficient seats for "${tierName}": requested=${requestedQty}, available=${available}`,
        );
        return "insufficient_seats" as const;
      }
    }

    // Decrement seats atomically (we hold the row lock via the transaction)
    const updatedPrices = tiers.map((tier) => {
      const name = typeof tier.name === "string" ? tier.name : "";
      const seats =
        typeof tier.seats === "number" && Number.isFinite(tier.seats)
          ? tier.seats
          : undefined;

      if (!name || seats === undefined) return tier;
      const qty = qtyByName.get(name) ?? 0;
      if (qty <= 0) return tier;
      return { ...tier, seats: seats - qty };
    });

    const totalTickets = totalSeatsFromPrices(updatedPrices);

    // Create ticket records
    for (const item of items) {
      const name = item.description ?? "General";
      const qty = item.quantity ?? 1;
      const unitAmount = item.price?.unit_amount ?? 0;

      const matchedTier = tiers.find(
        (t) => typeof t.name === "string" && t.name === name,
      );

      const resolvedPrice =
        typeof matchedTier?.price === "number"
          ? Math.round(matchedTier.price * 100)
          : unitAmount;

      await tx.ticket.create({
        data: {
          tierName: name,
          qty,
          unitPrice: resolvedPrice,
          paymentId,
          eventId,
          userId,
        },
      });

      createdTickets.push({ tierName: name, qty, unitPrice: resolvedPrice });
    }

    // Persist decremented seats + totalTickets
    await tx.event.update({
      where: { id: event.id },
      data: {
        prices: updatedPrices,
        totalTickets,
      },
    });

    return "created" as const;
  });

  if (result !== "created") {
    return { status: result, createdTickets: [] };
  }

  // Send confirmation email (non-blocking -- never fail the ticket flow)
  if (userId && createdTickets.length > 0) {
    try {
      const [user, event] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        }),
        prisma.event.findUnique({
          where: { id: eventId },
          select: {
            title: true,
            startDate: true,
            endDate: true,
            location: true,
            slug: true,
          },
        }),
      ]);

      if (user?.email && event) {
        const totalAmount = fullSession.amount_total ?? 0;

        await sendTicketConfirmationEmail({
          to: user.email,
          userName: user.name || "there",
          eventTitle: event.title,
          eventDate: event.startDate.toISOString(),
          eventEndDate: event.endDate.toISOString(),
          eventLocation: event.location,
          tickets: createdTickets,
          totalAmount,
          eventSlug: event.slug,
        });
      }
    } catch (emailError) {
      console.error(
        "[payments] Failed to send confirmation email:",
        emailError,
      );
    }
  }

  return { status: "created", createdTickets };
}
