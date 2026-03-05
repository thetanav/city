import { handleStripeWebhookRequest } from "@/lib/payments/stripe-webhook";

export async function POST(request: Request) {
  return handleStripeWebhookRequest(request);
}
