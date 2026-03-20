import { Elysia } from "elysia";
import { eventsRoutes } from "@/server/events";
import { ticketsRoutes } from "@/server/tickets";
import { profilesRoutes } from "@/server/profiles";
import { paymentsRoutes } from "@/server/payments";
import { healthRoutes } from "./health";
import { auth } from "@/lib/auth";

export const app = new Elysia({ prefix: "/api" })
  .mount("/auth", auth.handler)
  .use(eventsRoutes)
  .use(ticketsRoutes)
  .use(profilesRoutes)
  .use(paymentsRoutes)
  .use(healthRoutes);
