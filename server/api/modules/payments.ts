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

function assertSelections(selections: TierSelection[], tiers: RawTier[]) {
  const errors: string[] = [];
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  let subtotalCents = 0;
  const tierById = new Map<string, RawTier>();
  const tierByName = new Map<string, RawTier>();
  const nameCounts = new Map<string, number>();

  tiers.forEach((tier) => {
    if (tier.id) tierById.set(tier.id, tier);
    const nameKey = typeof tier.name === "string" ? tier.name.trim() : "";
    if (!nameKey) return;
    nameCounts.set(nameKey, (nameCounts.get(nameKey) ?? 0) + 1);
    if (!tierByName.has(nameKey)) tierByName.set(nameKey, tier);
  });

  selections.forEach((selection, index) => {
    const qty = Math.max(0, Math.floor(selection.qty));
    if (qty <= 0) return;
    let matchingTier = selection.id ? tierById.get(selection.id) : undefined;

    if (!matchingTier) {
      const nameKey = selection.name.trim();
      const nameCount = nameCounts.get(nameKey) ?? 0;
      if (nameCount > 1) {
        errors.push(`Multiple tiers named ${selection.name}`);
        return;
      }
      if (nameCount === 1) matchingTier = tierByName.get(nameKey);
    }

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
        currency: "inr",
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
    // console.log("Checkout session:", { session, body });
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
    // console.log("Event tiers:", { body: body.tiers, normalized: tiers });
    // body: [
    //   { id: 'tier-1', name: 'General', qty: 2 },
    //   { id: 'tier-2', name: 'VIP', qty: 1 }
    // ],
    // normalized: [
    //   { name: 'General', price: 25, seats: 120 },
    //   { name: 'VIP', price: 75, seats: 25 }
    // ]
    const selections = body.tiers.filter((tier) => tier.qty > 0);
    //   { id: 'tier-1', name: 'General', qty: 2 },
    //   { id: 'tier-2', name: 'VIP', qty: 1 }
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

    const feeCents = Math.min(
      500,
      Math.max(0, Math.round(subtotalCents * 0.02)),
    );

    if (feeCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "inr",
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

    const siteUrl = process.env.BETTER_AUTH_URL;
    console.log("Site URL:", siteUrl);
    if (!siteUrl) {
      set.status = 500;
      return { message: "Missing site URL" };
    }

    console.log("Creating Stripe session with line items:", lineItems);
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
    console.log("Created Stripe session:", {
      id: stripeSession.id,
      url: stripeSession.url,
    });

    return { url: stripeSession.url };
  },
  {
    body: checkoutSchema,
  },
);
