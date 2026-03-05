import { emailLogger, serverLogger, stripeLogger } from "@/lib/logger";
import Elysia from "elysia";

export const healthRoutes = new Elysia({ prefix: "/health" }).get("/", () => {
  emailLogger.info("Sending welcome email");
  emailLogger.error("Email delivery failed");

  stripeLogger.info({ paymentId: 232 }, "Stripe payment started");
  stripeLogger.error("Stripe webhook failed");

  serverLogger.info("Server started");
});
