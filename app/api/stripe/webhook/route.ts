import { NextResponse } from "next/server";
import { stripeClient } from "@/lib/stripe";
import { createTicketsFromSession } from "@/lib/payments";
import Stripe from "stripe";

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
  } catch {
    return NextResponse.json(
      { message: "Invalid signature" },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    try {
      const result = await createTicketsFromSession(session);

      if (result.status === "created") {
        console.log(
          `[webhook] Tickets created for payment ${session.payment_intent}: ${result.createdTickets.length} ticket(s)`,
        );
      } else if (result.status === "skipped") {
        console.log(
          `[webhook] Duplicate webhook for payment ${session.payment_intent}, skipped`,
        );
      } else {
        console.error(
          `[webhook] Ticket creation returned "${result.status}" for payment ${session.payment_intent}`,
        );
      }
    } catch (err) {
      console.error(
        `[webhook] Failed to process checkout.session.completed for ${session.id}:`,
        err,
      );
      // Return 500 so Stripe retries the webhook
      return NextResponse.json(
        { message: "Ticket creation failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
