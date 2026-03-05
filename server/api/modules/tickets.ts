import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const ticketsRoutes = new Elysia({ prefix: "/tickets" })
  .get(
    "/",
    async ({ query, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        set.status = 401;
        return { ok: false, message: "Unauthorised!" };
      }

      const where: Record<string, unknown> = {};

      if (query.eventId) {
        where.eventId = query.eventId;
      }

      // Users can only list their own tickets unless they own the event
      if (query.userId && query.userId === session.user.id) {
        where.userId = query.userId;
      } else if (query.eventId) {
        const event = await prisma.event.findUnique({
          where: { id: query.eventId },
          select: { creatorId: true },
        });

        if (event?.creatorId !== session.user.id) {
          // Not the event creator -- scope to own tickets only
          where.userId = session.user.id;
        }
      } else {
        where.userId = session.user.id;
      }

      const tickets = await prisma.ticket.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { event: true },
      });

      return { ok: true, data: tickets };
    },
    {
      query: t.Object({
        userId: t.Optional(t.String()),
        eventId: t.Optional(t.String()),
      }),
    },
  )
  .get(
    "/:id",
    async ({ params, request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return { ok: false, message: "Unauthorised!" };
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: params.id },
        include: { event: true },
      });

      if (!ticket) {
        return { ok: false, message: "Ticket not found!" };
      }

      // Allow access if user owns the ticket or is the event creator
      const isOwner = ticket.userId === session.user.id;
      const isCreator = ticket.event.creatorId === session.user.id;

      if (!isOwner && !isCreator) {
        return { ok: false, message: "Sign in with correct email!" };
      }

      return { ok: true, data: ticket };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .put(
    "/:id",
    async ({ params, body, request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return { ok: false, message: "Unauthorized!" };
      }

      const ticket = await prisma.ticket.findUnique({
        where: { id: params.id },
        include: { event: { select: { creatorId: true } } },
      });

      if (!ticket) {
        return { ok: false, message: "Ticket not found!" };
      }

      // Only the event creator can update tickets (e.g. toggle validity)
      if (ticket.event.creatorId !== session.user.id) {
        return { ok: false, message: "Sign in with correct email!" };
      }

      // Only allow toggling validity -- no other field changes
      try {
        const updated = await prisma.ticket.update({
          where: { id: params.id },
          data: { valid: body.valid },
          include: { event: true },
        });
        return { ok: false, data: updated };
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2025"
        ) {
          return { ok: false, message: "Ticket not found!" };
        }
        return { ok: false, message: "Failed to update ticket!" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ valid: t.Boolean() }),
    },
  );
