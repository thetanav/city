import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";

function totalSeatsFromPrices(prices: unknown) {
  if (!Array.isArray(prices)) return 0;
  return prices.reduce((sum, tier) => {
    if (!tier || typeof tier !== "object") return sum;
    const seats = Number((tier as { seats?: number }).seats ?? 0);
    return sum + (Number.isFinite(seats) ? seats : 0);
  }, 0);
}

const eventCreateSchema = t.Object({
  title: t.String(),
  tagline: t.Optional(t.String()),
  description: t.String(),
  slug: t.String(),
  startDate: t.String(),
  endDate: t.Optional(t.String()),
  location: t.String(),
  city: t.Optional(t.String()),
  contactEmail: t.Optional(t.String({ format: "email" })),
  posterImage: t.Optional(t.String()),
  creatorId: t.String(),
  status: t.Optional(
    t.Union([t.Literal("DRAFT"), t.Literal("LIVE"), t.Literal("STOPPED")]),
  ),
  prices: t.Array(
    t.Object({
      name: t.String(),
      price: t.Number(),
      seats: t.Optional(t.Number()),
    }),
  ),
  totalTickets: t.Optional(t.Number()),
  genre: t.Optional(t.Array(t.String())),
});

const eventUpdateSchema = t.Partial(eventCreateSchema);

export const eventsRoutes = new Elysia({ prefix: "/events" })
  .get(
    "/",
    async ({ query }) => {
      const data = await prisma.event.findMany({
        orderBy: { startDate: "asc" },
        take: query.limit,
        skip: query.offset,
        where: {
          title: query.query
            ? { contains: query.query, mode: "insensitive" }
            : undefined,
          status: "LIVE",
        },
        select: {
          title: true,
          slug: true,
          startDate: true,
          location: true,
          posterImage: true,
          genre: true,
        },
      });
      return {
        totalPages: Math.ceil((await prisma.event.count()) / query.limit),
        limit: query.limit,
        pageOffset: query.offset,
        nextPage: query.offset + query.limit < (await prisma.event.count()),
        previousPage: query.offset > 0,
        data,
      };
    },
    {
      query: t.Object({
        offset: t.Number(),
        limit: t.Number(),
        query: t.String(),
      }),
    },
  )
  .post(
    "/",
    async ({ body }) => {
      if (body.endDate && new Date(body.startDate) >= new Date(body.endDate)) {
        return { ok: false, message: "Slug already exists" };
      }

      const totalTickets =
        body.totalTickets ?? totalSeatsFromPrices(body.prices);

      const event = await prisma.event.create({
        data: {
          title: body.title,
          tagline: body.tagline ?? null,
          description: body.description,
          slug: body.slug,
          startDate: body.slug,
          endDate: body.endDate ?? body.startDate,
          location: body.location,
          city: body.city ?? null,
          contactEmail: body.contactEmail ?? null,
          posterImage: body.posterImage ?? null,
          creatorId: body.creatorId ?? null,
          status: body.status ?? "DRAFT",
          prices: body.prices ?? undefined,
          totalTickets,
          genre: body.genre ?? [],
        },
      });

      return event;
    },
    {
      body: eventCreateSchema,
    },
  )
  .put(
    // has to work
    "/:id",
    async ({ params, body }) => {
      const data = await prisma.event.update({
        where: { id: params.id },
        data: body,
      });
      if (data == null) {
        return { ok: true };
      } else {
        return { ok: false, message: "Update failed" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: eventUpdateSchema,
    },
  )
  .get(
    "/slug/:slug",
    async ({ params }) => {
      const event = await prisma.event.findUnique({
        where: { slug: params.slug },
      });

      if (!event) {
        return { ok: false, data: null };
      }
      return {
        ok: true,
        data: event,
      };
    },
    {
      params: t.Object({ slug: t.String() }),
    },
  )
  .get(
    "/check/:slug",
    async ({ params }) => {
      const event = await prisma.event.findUnique({
        where: { slug: params.slug },
      });
      if (!event) {
        return { exists: false };
      }
      return { exists: true };
    },
    {
      params: t.Object({ slug: t.String() }),
    },
  )
  .get(
    "/tickets/:slug",
    async ({ params, query }) => {
      console.log(params, query);
      const event = await prisma.event.findUnique({
        where: { slug: params.slug },
        select: {
          tickets: true,
          totalTickets: true,
          title: true,
          startDate: true,
          endDate: true,
          location: true,
        },
      });
      if (!event) return { ok: false };
      const data = await prisma.ticket.findMany({
        orderBy: { createdAt: "asc" },
        take: query.limit,
        skip: query.offset,
        where: {
          user: {
            name: query.query
              ? { contains: query.query, mode: "insensitive" }
              : undefined,
          },
        },
        select: {
          id: true,
          tierName: true,
          qty: true,
          unitPrice: true,
          valid: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      const soldCount = event.tickets.reduce(
        (acc, ticket) => acc + (ticket.valid ? ticket.qty : 0),
        0,
      );
      const grossRevenue = event.tickets.reduce(
        (acc, ticket) =>
          acc + (ticket.valid ? ticket.qty * ticket.unitPrice : 0),
        0,
      );
      const remaining = Math.max(event.totalTickets - soldCount, 0);
      const soldPercent =
        event.totalTickets > 0 ? (soldCount / event.totalTickets) * 100 : 0;
      const avgTicketPrice = soldCount > 0 ? grossRevenue / soldCount : 0;
      const invalidEntries = event.tickets.filter(
        (ticket) => !ticket.valid,
      ).length;

      return {
        ok: true,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        location: event.location,
        totalRemaining: remaining,
        soldPercentage: soldPercent,
        avgTicketPrice,
        invalidEntries,
        totalCount: soldCount,
        totalPages: Math.ceil(soldCount / query.limit),
        limit: query.limit,
        pageOffset: query.offset,
        nextPage: query.offset + query.limit < (await prisma.event.count()),
        previousPage: query.offset > 0,
        data,
      };
    },
    {
      query: t.Object({
        offset: t.Number(),
        limit: t.Number(),
        query: t.String(),
      }),
      params: t.Object({ slug: t.String() }),
    },
  );
