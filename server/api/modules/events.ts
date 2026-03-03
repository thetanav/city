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
      console.log("inside the get /", query.limit);
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
  );
