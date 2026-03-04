import { Elysia, t } from "elysia";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type TicketSortField = "qty" | "totalPrice" | "purchased" | "status" | "tier";
type TicketSortOrder = "asc" | "desc" | "dsc";

function resolveTicketOrderBy(
  filter: { field: TicketSortField; order: TicketSortOrder } | undefined,
) {
  const field = filter?.field ?? "purchased";
  const direction: "asc" | "desc" =
    filter?.order === "asc" ? "asc" : "desc";

  switch (field) {
    case "qty":
      return { qty: direction };
    case "totalPrice":
      return { unitPrice: direction };
    case "status":
      return { valid: direction };
    case "tier":
      return { tierName: direction };
    case "purchased":
    default:
      return { createdAt: direction };
  }
}

function totalSeatsFromPrices(prices: unknown) {
  if (!Array.isArray(prices)) return 0;
  return prices.reduce((sum, tier) => {
    if (!tier || typeof tier !== "object") return sum;
    const seats = Number((tier as { seats?: number }).seats ?? 0);
    return sum + (Number.isFinite(seats) ? seats : 0);
  }, 0);
}

const tierSchema = t.Object({
  id: t.Optional(t.String()),
  name: t.String(),
  price: t.Number(),
  seats: t.Optional(t.Number()),
  note: t.Optional(t.String()),
});

const eventCreateSchema = t.Object({
  title: t.String(),
  tagline: t.Optional(t.String()),
  description: t.String(),
  slug: t.String(),
  startDate: t.String(),
  endDate: t.Optional(t.String()),
  location: t.String(),
  city: t.Optional(t.String()),
  contactEmail: t.Optional(t.String()),
  posterImage: t.Optional(t.String()),
  status: t.Optional(
    t.Union([t.Literal("DRAFT"), t.Literal("LIVE"), t.Literal("STOPPED")]),
  ),
  prices: t.Array(tierSchema),
  totalTickets: t.Optional(t.Number()),
  genre: t.Optional(t.Array(t.String())),
});

const eventUpdateSchema = t.Object({
  title: t.Optional(t.String()),
  tagline: t.Optional(t.String()),
  description: t.Optional(t.String()),
  slug: t.Optional(t.String()),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
  location: t.Optional(t.String()),
  city: t.Optional(t.String()),
  contactEmail: t.Optional(t.String()),
  posterImage: t.Optional(t.String()),
  status: t.Optional(
    t.Union([t.Literal("DRAFT"), t.Literal("LIVE"), t.Literal("STOPPED")]),
  ),
  prices: t.Optional(t.Array(tierSchema)),
  totalTickets: t.Optional(t.Number()),
  genre: t.Optional(t.Array(t.String())),
});

export const eventsRoutes = new Elysia({ prefix: "/events" })
  .get(
    "/",
    async ({ query }) => {
      const where = {
        title: query.query
          ? { contains: query.query, mode: "insensitive" as const }
          : undefined,
        status: "LIVE" as const,
      };

      const totalCount = await prisma.event.count({ where });

      const data = await prisma.event.findMany({
        orderBy: { startDate: "asc" },
        take: query.limit,
        skip: query.offset,
        where,
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
        totalPages: Math.ceil(totalCount / query.limit),
        limit: query.limit,
        pageOffset: query.offset,
        nextPage: query.offset + query.limit < totalCount,
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
    async ({ body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        set.status = 401;
        return { ok: false, message: "Unauthorized" };
      }

      // Validate slug format
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugPattern.test(body.slug) || body.slug.length < 3) {
        set.status = 400;
        return { ok: false, message: "Invalid slug format" };
      }

      // Check slug uniqueness
      const existing = await prisma.event.findUnique({
        where: { slug: body.slug },
        select: { id: true },
      });

      if (existing) {
        set.status = 409;
        return { ok: false, message: "Slug already exists" };
      }

      // Validate dates
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        set.status = 400;
        return { ok: false, message: "Invalid start date" };
      }

      let endDate: Date | null = null;
      if (body.endDate) {
        endDate = new Date(body.endDate);
        if (isNaN(endDate.getTime())) {
          set.status = 400;
          return { ok: false, message: "Invalid end date" };
        }
        if (startDate >= endDate) {
          set.status = 400;
          return { ok: false, message: "End date must be after start date" };
        }
      }

      // Validate at least one tier
      if (body.prices.length === 0) {
        set.status = 400;
        return { ok: false, message: "At least one price tier is required" };
      }

      const totalTickets =
        body.totalTickets ?? totalSeatsFromPrices(body.prices);

      try {
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
            creatorId: session.user.id,
            status: body.status ?? "DRAFT",
            prices: body.prices,
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
          return { ok: false, message: "Slug already exists" };
        }
        console.error("[events] Failed to create event:", error);
        set.status = 500;
        return { ok: false, message: "Failed to create event" };
      }
    },
    {
      body: eventCreateSchema,
    },
  )
  .put(
    "/:id",
    async ({ params, body, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        set.status = 401;
        return { ok: false, message: "Unauthorized" };
      }

      const event = await prisma.event.findUnique({
        where: { id: params.id },
        select: { creatorId: true },
      });

      if (!event) {
        set.status = 404;
        return { ok: false, message: "Event not found" };
      }

      if (event.creatorId !== session.user.id) {
        set.status = 403;
        return { ok: false, message: "Only the event creator can update this event" };
      }

      // Build update data, only including provided fields
      const updateData: Record<string, unknown> = {};

      if (body.title !== undefined) updateData.title = body.title;
      if (body.tagline !== undefined) updateData.tagline = body.tagline;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.location !== undefined) updateData.location = body.location;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
      if (body.posterImage !== undefined) updateData.posterImage = body.posterImage;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.genre !== undefined) updateData.genre = body.genre;

      if (body.startDate !== undefined) {
        const d = new Date(body.startDate);
        if (isNaN(d.getTime())) {
          set.status = 400;
          return { ok: false, message: "Invalid start date" };
        }
        updateData.startDate = d;
      }

      if (body.endDate !== undefined) {
        const d = new Date(body.endDate);
        if (isNaN(d.getTime())) {
          set.status = 400;
          return { ok: false, message: "Invalid end date" };
        }
        updateData.endDate = d;
      }

      if (body.slug !== undefined) {
        const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugPattern.test(body.slug) || body.slug.length < 3) {
          set.status = 400;
          return { ok: false, message: "Invalid slug format" };
        }
        updateData.slug = body.slug;
      }

      if (body.prices !== undefined) {
        updateData.prices = body.prices;
        updateData.totalTickets =
          body.totalTickets ?? totalSeatsFromPrices(body.prices);
      } else if (body.totalTickets !== undefined) {
        updateData.totalTickets = body.totalTickets;
      }

      try {
        const updated = await prisma.event.update({
          where: { id: params.id },
          data: updateData,
        });

        return { ok: true, data: updated };
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          set.status = 409;
          return { ok: false, message: "Slug already exists" };
        }
        console.error("[events] Failed to update event:", error);
        set.status = 500;
        return { ok: false, message: "Failed to update event" };
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
        select: { id: true },
      });
      return { exists: !!event };
    },
    {
      params: t.Object({ slug: t.String() }),
    },
  )
  .get(
    "/tickets/:slug",
    async ({ params, query, request, set }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        set.status = 401;
        return { ok: false };
      }

      const event = await prisma.event.findUnique({
        where: { slug: params.slug },
        select: {
          id: true,
          tickets: true,
          totalTickets: true,
          title: true,
          startDate: true,
          endDate: true,
          location: true,
          creatorId: true,
        },
      });

      if (!event) {
        set.status = 404;
        return { ok: false };
      }

      if (event.creatorId !== session.user.id) {
        set.status = 403;
        return { ok: false };
      }

      const where = query.query
        ? {
            eventId: event.id,
            user: {
              is: {
                name: { contains: query.query, mode: "insensitive" as const },
              },
            },
          }
        : {
            eventId: event.id,
          };

      const totalTicketCount = await prisma.ticket.count({ where });

      const data = await prisma.ticket.findMany({
        orderBy: resolveTicketOrderBy(query.filter),
        take: query.limit,
        skip: query.offset,
        where,
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
        totalPages: Math.ceil(totalTicketCount / query.limit),
        limit: query.limit,
        pageOffset: query.offset,
        nextPage: query.offset + query.limit < totalTicketCount,
        previousPage: query.offset > 0,
        data,
      };
    },
    {
      query: t.Object({
        offset: t.Number(),
        limit: t.Number(),
        query: t.String(),
        filter: t.Object({
          field: t.Union([
            t.Literal("qty"),
            t.Literal("totalPrice"),
            t.Literal("purchased"),
            t.Literal("status"),
            t.Literal("tier"),
          ]),
          order: t.Union([t.Literal("asc"), t.Literal("desc"), t.Literal("dsc")]),
        }),
      }),
      params: t.Object({ slug: t.String() }),
    },
  );
