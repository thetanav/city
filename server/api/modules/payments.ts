import { Elysia, t } from "elysia";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripeClient } from "@/lib/stripe";
import type Stripe from "stripe";

const checkoutSchema = t.Object({
  eventId: t.String(),
  tiers: t.Array(
    t.Object({
      id: t.String(),
      name: t.String(),
      qty: t.Number(),
    }),
  ),
});

type TierSelection = {
  id: string;
  name: string;
  qty: number;
};

type RawTier = {
  id?: string;
  name?: string;
  price?: number;
};

function normalizePrices(prices: unknown) {
  if (!Array.isArray(prices)) return [] as RawTier[];
  return prices as RawTier[];
}

function formatTierName(tier: RawTier, fallback: string) {
  return typeof tier.name === "string" && tier.name.trim() !== ""
    ? tier.name
    : fallback;
}

function getTierPrice(tier: RawTier) {
  return typeof tier.price === "number" && Number.isFinite(tier.price)
    ? tier.price
    : 0;
}

function assertSelections(
  selections: TierSelection[],
  tiers: RawTier[],
) {
  const errors: string[] = [];
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let subtotalCents = 0;

  selections.forEach((selection, index) => {
    const qty = Math.max(0, Math.floor(selection.qty));
    if (qty <= 0) return;
    const matchingTier = tiers.find((tier) => tier.id === selection.id);

    if (!matchingTier) {
      errors.push(`Unknown tier selection: ${selection.name}`);
      return;
    }

    const unitPrice = getTierPrice(matchingTier);
    const name = formatTierName(matchingTier, selection.name);
    const unitAmount = Math.round(unitPrice * 100);

    if (unitAmount < 0) {
      errors.push(`Invalid price for ${name}`);
      return;
    }

    subtotalCents += unitAmount * qty;

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: "usd",
        unit_amount: unitAmount,
        product_data: {
          name,
          metadata: {
            type: "ticket",
            tierId: matchingTier.id ?? selection.id,
          },
        },
      },
    });
  });

  return { errors, lineItems, subtotalCents };
}

export const paymentsRoutes = new Elysia({ prefix: "/payments" }).post(
  "/checkout",
  async ({ request, body, set }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      set.status = 401;
      return { message: "Unauthorized" };
    }

    const event = await prisma.event.findUnique({
      where: { id: body.eventId },
    });

    if (!event) {
      set.status = 404;
      return { message: "Event not found" };
    }

    const tiers = normalizePrices(event.prices);
    const selections = body.tiers.filter((tier) => tier.qty > 0);
    const { errors, lineItems, subtotalCents } = assertSelections(
      selections,
      tiers,
    );

    if (errors.length > 0) {
      set.status = 400;
      return { message: errors[0] };
    }

    if (lineItems.length === 0) {
      set.status = 400;
      return { message: "No ticket selections" };
    }

    const feeCents = Math.min(500, Math.max(0, Math.round(subtotalCents * 0.02)));

    if (feeCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: feeCents,
          product_data: {
            name: "Service fee",
            metadata: {
              type: "fee",
            },
          },
        },
      });
    }

    const siteUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      set.status = 500;
      return { message: "Missing site URL" };
    }

    const stripeSession = await stripeClient.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      success_url: `${siteUrl}/e/${event.slug}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/e/${event.slug}?payment=cancel`,
      customer_email: session.user.email ?? undefined,
      metadata: {
        userId: session.user.id,
        eventId: event.id,
      },
    });

    return { url: stripeSession.url };
  },
  {
    body: checkoutSchema,
  },
);
