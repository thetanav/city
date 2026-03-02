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

function toDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
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
    async ({ params }) => {
      prisma.event.findMany({
        orderBy: { startDate: "asc" },
        take: params.take,
        skip: params.skip,
        where: {
          title: params.query
            ? { contains: params.query, mode: "insensitive" }
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
    },
    {
      params: t.Object({
        skip: t.Optional(t.Number()).default(0),
        take: t.Optional(t.Number()).default(10),
        query: t.Optional(t.String()),
      }),
    },
  )
  .post(
    "/",
    async ({ body, set }) => {
      const startDate = toDate(body.startDate);

      if (!startDate) {
        set.status = 400;
        return { message: "Invalid start date" };
      }

      const endDate = body.endDate ? toDate(body.endDate) : undefined;

      if (body.endDate && !endDate) {
        set.status = 400;
        return { message: "Invalid end date" };
      }

      try {
        const totalTickets =
          body.totalTickets ?? totalSeatsFromPrices(body.prices);

        const event = await prisma.event.create({
          data: {
            title: body.title,
            tagline: body.tagline ?? null,
            description: body.description,
            slug: body.slug,
            startDate,
            endDate: endDate ?? startDate,
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
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          set.status = 409;
          return { message: "Slug already exists" };
        }

        set.status = 500;
        return { message: "Failed to create event" };
      }
    },
    {
      body: eventCreateSchema,
    },
  )
  .put(
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
  .delete(
    "/:id",
    async ({ params }) => {
      const data = await prisma.event.delete({ where: { id: params.id } });
      if (data == null) {
        return { ok: true };
      } else {
        return { ok: false, message: "Delete failed" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .get(
    "/slug",
    async ({ params }) => {
      const event = await prisma.event.findUnique({
        where: { slug: params.slug },
        select: { id: true },
      });

      if (event) {
        return { exists: false };
      }

      return { exists: true };
    },
    {
      params: t.Object({ slug: t.String() }),
    },
  );
