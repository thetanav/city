import { describe, expect, it } from "bun:test";
import type Stripe from "stripe";

import { handleStripeWebhookRequest } from "@/lib/payments/stripe-webhook";

const noopLogger = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

function buildRequest(signature = "sig_test") {
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": signature,
    },
    body: JSON.stringify({ id: "evt_test" }),
  });
}

function checkoutEvent(
  type: Stripe.Event.Type,
  paymentStatus: Stripe.Checkout.Session.PaymentStatus,
): Stripe.Event {
  return {
    id: "evt_test",
    object: "event",
    api_version: "2025-02-24.acacia",
    created: Date.now(),
    data: {
      object: {
        id: "cs_test",
        object: "checkout.session",
        payment_status: paymentStatus,
        payment_intent: "pi_test",
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type,
  } as unknown as Stripe.Event;
}

describe("handleStripeWebhookRequest", () => {
  it("returns 400 when stripe signature is missing", async () => {
    const request = new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "evt_test" }),
    });

    const response = await handleStripeWebhookRequest(request, {
      webhookSecret: "whsec_test",
      constructEvent: () => checkoutEvent("checkout.session.completed", "paid"),
      createTickets: async () => ({ status: "created", createdTickets: [] }),
      logger: noopLogger,
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 for invalid signature payload", async () => {
    const response = await handleStripeWebhookRequest(buildRequest(), {
      webhookSecret: "whsec_test",
      constructEvent: () => {
        throw new Error("invalid signature");
      },
      createTickets: async () => ({ status: "created", createdTickets: [] }),
      logger: noopLogger,
    });

    expect(response.status).toBe(400);
  });

  it("returns 200 and ignores unrelated events", async () => {
    let called = false;

    const response = await handleStripeWebhookRequest(buildRequest(), {
      webhookSecret: "whsec_test",
      constructEvent: () =>
        ({
          id: "evt_2",
          object: "event",
          api_version: "2025-02-24.acacia",
          created: Date.now(),
          data: { object: { id: "cus_123" } },
          livemode: false,
          pending_webhooks: 1,
          request: { id: null, idempotency_key: null },
          type: "customer.created",
        }) as unknown as Stripe.Event,
      createTickets: async () => {
        called = true;
        return { status: "created", createdTickets: [] };
      },
      logger: noopLogger,
    });

    expect(response.status).toBe(200);
    expect(called).toBe(false);
  });

  it("returns 200 and skips unpaid checkout sessions", async () => {
    let called = false;

    const response = await handleStripeWebhookRequest(buildRequest(), {
      webhookSecret: "whsec_test",
      constructEvent: () => checkoutEvent("checkout.session.completed", "unpaid"),
      createTickets: async () => {
        called = true;
        return { status: "created", createdTickets: [] };
      },
      logger: noopLogger,
    });

    expect(response.status).toBe(200);
    expect(called).toBe(false);
  });

  it("processes paid checkout sessions", async () => {
    let called = 0;

    const response = await handleStripeWebhookRequest(buildRequest(), {
      webhookSecret: "whsec_test",
      constructEvent: () => checkoutEvent("checkout.session.completed", "paid"),
      createTickets: async () => {
        called += 1;
        return { status: "created", createdTickets: [] };
      },
      logger: noopLogger,
    });

    expect(response.status).toBe(200);
    expect(called).toBe(1);
  });

  it("returns 500 when ticket creation throws so Stripe retries", async () => {
    const response = await handleStripeWebhookRequest(buildRequest(), {
      webhookSecret: "whsec_test",
      constructEvent: () =>
        checkoutEvent("checkout.session.async_payment_succeeded", "paid"),
      createTickets: async () => {
        throw new Error("db down");
      },
      logger: noopLogger,
    });

    expect(response.status).toBe(500);
  });
});
