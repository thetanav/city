import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";

const ticketCreateSchema = t.Object({
  tierName: t.String(),
  qty: t.Number(),
  eventId: t.String(),
  unitPrice: t.Number(),
  totalPaid: t.Number(),
  currency: t.Optional(t.String()),
  status: t.Optional(t.String()),
  paymentId: t.Optional(t.String()),
  userId: t.Optional(t.String()),
});

const ticketUpdateSchema = t.Partial(ticketCreateSchema);

export const ticketsRoutes = new Elysia({ prefix: "/tickets" })
  .get(
    "/",
    async ({ query }) =>
      prisma.ticket.findMany({
        where: {
          userId: typeof query.userId === "string" ? query.userId : undefined,
          eventId: typeof query.eventId === "string" ? query.eventId : undefined,
        },
        orderBy: { createdAt: "desc" },
        include: { event: true },
      }),
    {
      query: t.Object({
        userId: t.Optional(t.String()),
        eventId: t.Optional(t.String()),
      }),
    }
  )
  .get(
    "/:id",
    async ({ params, set }) => {
      const ticket = await prisma.ticket.findUnique({
        where: { id: params.id },
        include: { event: true },
      });

      if (!ticket) {
        set.status = 404;
        return { message: "Ticket not found" };
      }

      return ticket;
    },
    {
      params: t.Object({ id: t.String() }),
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      try {
        const ticket = await prisma.ticket.create({
          data: {
            tierName: body.tierName,
            qty: body.qty,
            eventId: body.eventId,
            unitPrice: body.unitPrice,
            totalPaid: body.totalPaid,
            currency: body.currency ?? "usd",
            status: body.status ?? "paid",
            paymentId: body.paymentId ?? null,
            userId: body.userId ?? null,
          },
          include: { event: true },
        });
        return ticket;
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2003"
        ) {
          set.status = 400;
          return { message: "Invalid event or user reference" };
        }

        set.status = 500;
        return { message: "Failed to create ticket" };
      }
    },
    {
      body: ticketCreateSchema,
    }
  )
  .put(
    "/:id",
    async ({ params, body, set }) => {
      try {
        const ticket = await prisma.ticket.update({
          where: { id: params.id },
          data: { ...body, userId: body.userId ?? undefined },
          include: { event: true },
        });
        return ticket;
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2025"
        ) {
          set.status = 404;
          return { message: "Ticket not found" };
        }

        set.status = 500;
        return { message: "Failed to update ticket" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: ticketUpdateSchema,
    }
  )
  .delete(
    "/:id",
    async ({ params, set }) => {
      try {
        await prisma.ticket.delete({ where: { id: params.id } });
        return { ok: true };
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2025"
        ) {
          set.status = 404;
          return { message: "Ticket not found" };
        }

        set.status = 500;
        return { message: "Failed to delete ticket" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
    }
  );
