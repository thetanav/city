import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { stripe } from "@better-auth/stripe";
import { stripeClient } from "./stripe";

export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    nextCookies(),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
      onEvent: async (event) => {
        // Log all Stripe events received through the Better Auth webhook endpoint
        console.log(`[better-auth/stripe] Event received: ${event.type}`);
      },
    }),
  ],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
});
