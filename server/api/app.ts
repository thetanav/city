import { Elysia } from "elysia";
import { eventsRoutes } from "@/server/api/modules/events";
import { ticketsRoutes } from "@/server/api/modules/tickets";
import { profilesRoutes } from "@/server/api/modules/profiles";
import { paymentsRoutes } from "@/server/api/modules/payments";
import { healthRoutes } from "./modules/health";

export const app = new Elysia({ prefix: "/api" })
  .use(eventsRoutes)
  .use(ticketsRoutes)
  .use(profilesRoutes)
  .use(paymentsRoutes)
  .use(healthRoutes);
