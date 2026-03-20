import { Elysia, t } from "elysia";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/db";

export const ticketsRoutes = new Elysia({ prefix: "/tickets" })
  .get(
    "/",
    async ({ query, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        set.status = 401;
        return { ok: false, message: "Unauthorised!" };
      }

      let scopedUserId: string | undefined;

      // Users can only list their own tickets unless they own the event
      if (query.userId && query.userId === session.user.id) {
        scopedUserId = query.userId;
      } else if (query.eventId) {
        const [event] = await db
          .select({ creatorId: schema.event.creatorId })
          .from(schema.event)
          .where(eq(schema.event.id, query.eventId))
          .limit(1);

        if (event?.creatorId !== session.user.id) {
          // Not the event creator -- scope to own tickets only
          scopedUserId = session.user.id;
        }
      } else {
        scopedUserId = session.user.id;
      }

      const filters = [];
      if (query.eventId) filters.push(eq(schema.ticket.eventId, query.eventId));
      if (scopedUserId) filters.push(eq(schema.ticket.userId, scopedUserId));

      const tickets = await db
        .select({
          id: schema.ticket.id,
          tierName: schema.ticket.tierName,
          qty: schema.ticket.qty,
          unitPrice: schema.ticket.unitPrice,
          paymentId: schema.ticket.paymentId,
          eventId: schema.ticket.eventId,
          userId: schema.ticket.userId,
          createdAt: schema.ticket.createdAt,
          updatedAt: schema.ticket.updatedAt,
          valid: schema.ticket.valid,
          event: {
            id: schema.event.id,
            posterImage: schema.event.posterImage,
            title: schema.event.title,
            tagline: schema.event.tagline,
            description: schema.event.description,
            slug: schema.event.slug,
            startDate: schema.event.startDate,
            endDate: schema.event.endDate,
            location: schema.event.location,
            city: schema.event.city,
            contactEmail: schema.event.contactEmail,
            prices: schema.event.prices,
            totalTickets: schema.event.totalTickets,
            bookedTickets: schema.event.bookedTickets,
            genre: schema.event.genre,
            creatorId: schema.event.creatorId,
            createdAt: schema.event.createdAt,
            updatedAt: schema.event.updatedAt,
            status: schema.event.status,
          },
        })
        .from(schema.ticket)
        .innerJoin(schema.event, eq(schema.event.id, schema.ticket.eventId))
        .where(filters.length > 0 ? and(...filters) : undefined)
        .orderBy(desc(schema.ticket.createdAt));

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

      const [ticket] = await db
        .select({
          id: schema.ticket.id,
          tierName: schema.ticket.tierName,
          qty: schema.ticket.qty,
          unitPrice: schema.ticket.unitPrice,
          paymentId: schema.ticket.paymentId,
          eventId: schema.ticket.eventId,
          userId: schema.ticket.userId,
          createdAt: schema.ticket.createdAt,
          updatedAt: schema.ticket.updatedAt,
          valid: schema.ticket.valid,
          event: {
            id: schema.event.id,
            posterImage: schema.event.posterImage,
            title: schema.event.title,
            tagline: schema.event.tagline,
            description: schema.event.description,
            slug: schema.event.slug,
            startDate: schema.event.startDate,
            endDate: schema.event.endDate,
            location: schema.event.location,
            city: schema.event.city,
            contactEmail: schema.event.contactEmail,
            prices: schema.event.prices,
            totalTickets: schema.event.totalTickets,
            bookedTickets: schema.event.bookedTickets,
            genre: schema.event.genre,
            creatorId: schema.event.creatorId,
            createdAt: schema.event.createdAt,
            updatedAt: schema.event.updatedAt,
            status: schema.event.status,
          },
        })
        .from(schema.ticket)
        .innerJoin(schema.event, eq(schema.event.id, schema.ticket.eventId))
        .where(eq(schema.ticket.id, params.id))
        .limit(1);

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

      const [ticket] = await db
        .select({
          id: schema.ticket.id,
          creatorId: schema.event.creatorId,
        })
        .from(schema.ticket)
        .innerJoin(schema.event, eq(schema.event.id, schema.ticket.eventId))
        .where(eq(schema.ticket.id, params.id))
        .limit(1);

      if (!ticket) {
        return { ok: false, message: "Ticket not found!" };
      }

      // Only the event creator can update tickets (e.g. toggle validity)
      if (ticket.creatorId !== session.user.id) {
        return { ok: false, message: "Sign in with correct email!" };
      }

      // Only allow toggling validity -- no other field changes
      try {
        const [updated] = await db
          .update(schema.ticket)
          .set({ valid: body.valid, updatedAt: new Date() })
          .where(eq(schema.ticket.id, params.id))
          .returning();
        return { ok: false, data: updated };
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "23503"
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
