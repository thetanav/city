import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createTicketsFromSession } from "@/lib/payments";
import { stripeClient } from "@/lib/stripe";

type WebhookLogger = Pick<Console, "log" | "error" | "warn">;

type StripeWebhookDeps = {
  constructEvent: (
    payload: string,
    signature: string,
    secret: string,
  ) => Stripe.Event;
  createTickets: typeof createTicketsFromSession;
  webhookSecret: string | undefined;
  logger: WebhookLogger;
};

const processableEvents = new Set<Stripe.Event.Type>([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const defaultDeps: StripeWebhookDeps = {
  constructEvent: stripeClient.webhooks.constructEvent.bind(stripeClient.webhooks),
  createTickets: createTicketsFromSession,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  logger: console,
};

export async function handleStripeWebhookRequest(
  request: Request,
  deps: StripeWebhookDeps = defaultDeps,
) {
  if (!deps.webhookSecret) {
    deps.logger.error("[webhook] STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json(
      { message: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = deps.constructEvent(rawBody, signature, deps.webhookSecret);
  } catch {
    return NextResponse.json(
      { message: "Invalid signature" },
      { status: 400 },
    );
  }

  if (!processableEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    deps.logger.log(
      `[webhook] Ignoring ${event.type} for unpaid session ${session.id} (status=${session.payment_status})`,
    );
    return NextResponse.json({ received: true });
  }

  try {
    const result = await deps.createTickets(session);

    if (result.status === "created") {
      deps.logger.log(
        `[webhook] Tickets created for payment ${session.payment_intent}: ${result.createdTickets.length} ticket(s)`,
      );
    } else if (result.status === "skipped") {
      deps.logger.log(
        `[webhook] Duplicate webhook for payment ${session.payment_intent}, skipped`,
      );
    } else {
      deps.logger.warn(
        `[webhook] Ticket creation returned "${result.status}" for payment ${session.payment_intent}`,
      );
    }
  } catch (err) {
    deps.logger.error(
      `[webhook] Failed to process ${event.type} for ${session.id}:`,
      err,
    );
    return NextResponse.json(
      { message: "Ticket creation failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
