import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/stripe";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    sessionId?: string;
  } | null;

  if (!payload?.sessionId) {
    return NextResponse.json(
      { message: "Missing session_id" },
      { status: 400 },
    );
  }

  try {
    const session = await stripeClient.checkout.sessions.retrieve(
      payload.sessionId,
      { expand: ["line_items"] },
    );

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { message: "Payment not completed" },
        { status: 409 },
      );
    }

    const paymentId = session.payment_intent?.toString() ?? null;
    const eventId = session.metadata?.eventId ?? null;
    const userId = session.metadata?.userId ?? null;

    let processed = false;
    if (paymentId && eventId) {
      const existing = await prisma.ticket.findFirst({
        where: { paymentId, eventId },
        select: { id: true },
      });
      processed = Boolean(existing);
    }

    return NextResponse.json({
      ok: true,
      status: processed ? "processed" : "pending",
      paymentId,
      eventId,
      userId,
    });
  } catch (error) {
    console.error("[payments] Failed to confirm payment:", error);
    return NextResponse.json(
      { message: "Failed to confirm payment" },
      { status: 500 },
    );
  }
}
