import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/stripe";
import Stripe from "stripe";

async function createTicketsFromSession(session: Stripe.Checkout.Session) {
  const metadata = session.metadata ?? {};
  const eventId = metadata.eventId;
  const userId = metadata.userId ?? null;

  if (!eventId) {
    return;
  }

  const fullSession = session.amount_total
    ? session
    : await stripeClient.checkout.sessions.retrieve(session.id, {
        expand: ["line_items"],
      });

  const items = (fullSession.line_items?.data ?? []).filter(
    (item) => item.description !== "Service fee",
  );
  if (items.length === 0) return;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;

  const tiers = Array.isArray(event.prices) ? event.prices : [];

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

    await prisma.ticket.create({
      data: {
        tierName: name,
        qty,
        unitPrice: resolvedPrice,
        paymentId: fullSession.payment_intent?.toString() ?? null,
        eventId,
        userId,
      },
    });
  }
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Invalid signature" },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    await createTicketsFromSession(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
