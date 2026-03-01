import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/stripe";
import { sendTicketConfirmationEmail } from "@/lib/email";

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
  | "missing_metadata";

export type TicketCreateResult = {
  status: TicketCreateStatus;
  createdTickets: CreatedTicket[];
};

type PriceTier = {
  name?: string;
  price?: number;
  seats?: number;
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

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return { status: "missing_event", createdTickets: [] };
  }

  const tiers = Array.isArray(event.prices) ? event.prices : [];
  const createdTickets: CreatedTicket[] = [];

  const qtyByName = new Map<string, number>();
  for (const item of items) {
    const name = item.description ?? "General";
    const qty = item.quantity ?? 1;
    qtyByName.set(name, (qtyByName.get(name) ?? 0) + qty);
  }

  const updatedPrices = tiers.map((tier) => {
    if (!tier || typeof tier !== "object") return tier;
    const typedTier = tier as PriceTier;
    const name = typeof typedTier.name === "string" ? typedTier.name : "";
    const seats =
      typeof typedTier.seats === "number" && Number.isFinite(typedTier.seats)
        ? typedTier.seats
        : undefined;
    if (!name || seats === undefined) return tier;
    const qty = qtyByName.get(name) ?? 0;
    if (qty <= 0) return tier;
    return { ...typedTier, seats: Math.max(0, seats - qty) };
  });

  const totalTickets = totalSeatsFromPrices(updatedPrices);

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      const name = item.description ?? "General";
      const qty = item.quantity ?? 1;
      const unitAmount = item.price?.unit_amount ?? 0;

      const matchedTier = tiers.find(
        (tier) =>
          typeof tier === "object" &&
          tier !== null &&
          "name" in tier &&
          (tier as { name?: string }).name === name,
      ) as { name?: string; price?: number } | undefined;

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

    if (Array.isArray(event.prices)) {
      await tx.event.update({
        where: { id: event.id },
        data: {
          prices: updatedPrices,
          totalTickets,
        },
      });
    }
  });

  if (userId && createdTickets.length > 0) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user?.email) {
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
      console.error("[payments] Failed to send confirmation email:", emailError);
    }
  }

  return { status: "created", createdTickets };
}
