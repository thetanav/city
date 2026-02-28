import { Elysia } from "elysia";
import { eventsRoutes } from "@/server/api/modules/events";
import { healthRoutes } from "@/server/api/modules/health";
import { organizersRoutes } from "@/server/api/modules/organizers";
import { ticketsRoutes } from "@/server/api/modules/tickets";
import { profilesRoutes } from "@/server/api/modules/profiles";
import { paymentsRoutes } from "@/server/api/modules/payments";

export const app = new Elysia({ prefix: "/api" })
  .use(healthRoutes)
  .use(eventsRoutes)
  .use(organizersRoutes)
  .use(ticketsRoutes)
  .use(profilesRoutes)
  .use(paymentsRoutes);
