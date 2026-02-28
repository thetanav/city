import { Elysia } from "elysia";
import { eventsRoutes } from "@/server/api/modules/events";
import { healthRoutes } from "@/server/api/modules/health";
import { organizersRoutes } from "@/server/api/modules/organizers";
import { ticketsRoutes } from "@/server/api/modules/tickets";

export const app = new Elysia({ prefix: "/api" })
  .use(healthRoutes)
  .use(eventsRoutes)
  .use(organizersRoutes)
  .use(ticketsRoutes);
