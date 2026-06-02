import { Elysia, t } from "elysia";
import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { rateLimit } from "elysia-rate-limit";
import { db, schema } from "@/db";

type TicketSortField = "qty" | "totalPrice" | "purchased" | "status" | "tier";
type TicketSortOrder = "asc" | "desc" | "dsc";

function resolveTicketOrderBy(
  filter: { field: TicketSortField; order: TicketSortOrder } | undefined,
) {
  const field = filter?.field ?? "purchased";
  const order = filter?.order === "asc" ? asc : desc;

  switch (field) {
    case "qty":
      return order(schema.ticket.qty);
    case "totalPrice":
      return order(schema.ticket.unitPrice);
    case "status":
      return order(schema.ticket.valid);
    case "tier":
      return order(schema.ticket.tierName);
    case "purchased":
    default:
      return order(schema.ticket.createdAt);
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
  .post(
    "/",
    async ({ body, request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return { ok: false, message: "Unauthorized" };
      }

      // Validate slug format
      const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugPattern.test(body.slug) || body.slug.length < 3) {
        return { ok: false, message: "Invalid slug format" };
      }

      // Check slug uniqueness
      const [existing] = await db
        .select({ id: schema.event.id })
        .from(schema.event)
        .where(eq(schema.event.slug, body.slug))
        .limit(1);

      if (existing) {
        return { ok: false, message: "Slug already exists" };
      }

      // Validate dates
      const startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return { ok: false, message: "Invalid start date" };
      }

      let endDate: Date | null = null;
      if (body.endDate) {
        endDate = new Date(body.endDate);
        if (isNaN(endDate.getTime())) {
          return { ok: false, message: "Invalid end date" };
        }
        if (startDate >= endDate) {
          return { ok: false, message: "End date must be after start date" };
        }
      }

      // Validate at least one tier
      if (body.prices.length === 0) {
        return { ok: false, message: "At least one price tier is required" };
      }

      const totalTickets =
        body.totalTickets ?? totalSeatsFromPrices(body.prices);

      try {
        const [event] = await db
          .insert(schema.event)
          .values({
            id: crypto.randomUUID(),
            createdAt: new Date(),
            updatedAt: new Date(),
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
          })
          .returning();

        return { ok: true, data: event };
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "23505"
        ) {
          return { ok: false, message: "Slug already exists" };
        }
        console.error("[events] Failed to create event:", error);
        return { ok: false, message: "Failed to create event" };
      }
    },
    {
      body: eventCreateSchema,
    },
  )
  .put(
    "/:id",
    async ({ params, body, request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return { ok: false, message: "Unauthorized!" };
      }

      const [event] = await db
        .select({
          creatorId: schema.event.creatorId,
          startDate: schema.event.startDate,
          endDate: schema.event.endDate,
        })
        .from(schema.event)
        .where(eq(schema.event.id, params.id))
        .limit(1);

      if (!event) {
        return { ok: false, message: "Event not found!" };
      }

      if (event.creatorId !== session.user.id) {
        return {
          ok: false,
          message: "Sign in from correct email!",
        };
      }

      // Build update data, only including provided fields
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (body.title !== undefined) updateData.title = body.title;
      if (body.tagline !== undefined) updateData.tagline = body.tagline;
      if (body.description !== undefined)
        updateData.description = body.description;
      if (body.location !== undefined) updateData.location = body.location;
      if (body.city !== undefined) updateData.city = body.city;
      if (body.contactEmail !== undefined)
        updateData.contactEmail = body.contactEmail;
      if (body.posterImage !== undefined)
        updateData.posterImage = body.posterImage;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.genre !== undefined) updateData.genre = body.genre;

      if (body.startDate !== undefined) {
        const d = new Date(body.startDate);
        if (isNaN(d.getTime())) {
          return { ok: false, message: "Invalid start date" };
        }
        updateData.startDate = d;
      }

      if (body.endDate !== undefined) {
        const d = new Date(body.endDate);
        if (isNaN(d.getTime())) {
          return { ok: false, message: "Invalid end date" };
        }
        updateData.endDate = d;
      }

      const nextStartDate =
        updateData.startDate instanceof Date
          ? updateData.startDate
          : event.startDate;
      const nextEndDate =
        updateData.endDate instanceof Date ? updateData.endDate : event.endDate;

      if (nextStartDate >= nextEndDate) {
        return { ok: false, message: "End date must be after start date" };
      }

      if (body.slug !== undefined) {
        const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugPattern.test(body.slug) || body.slug.length < 3) {
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
        const [updated] = await db
          .update(schema.event)
          .set(updateData)
          .where(eq(schema.event.id, params.id))
          .returning();

        return { ok: true, data: updated };
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "23505"
        ) {
          return { ok: false, message: "Slug already exists" };
        }
        console.error("[events] Failed to update event:", error);
        return { ok: false, message: "Failed to update event" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: eventUpdateSchema,
    },
  )
  .get("/mine", async ({ request }) => {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return { ok: false, message: "Unauthorised!" };
    }

    const events = await db
      .select({
        id: schema.event.id,
        title: schema.event.title,
        slug: schema.event.slug,
        startDate: schema.event.startDate,
        endDate: schema.event.endDate,
        location: schema.event.location,
        city: schema.event.city,
        status: schema.event.status,
        totalTickets: schema.event.totalTickets,
        ticketCount: sql<number>`count(${schema.ticket.id})`,
      })
      .from(schema.event)
      .leftJoin(schema.ticket, eq(schema.ticket.eventId, schema.event.id))
      .where(eq(schema.event.creatorId, session.user.id))
      .groupBy(schema.event.id)
      .orderBy(desc(schema.event.startDate));

    if (events.length === 0) {
      return { ok: true, data: [] };
    }

    const soldByEvent = await db
      .select({
        eventId: schema.ticket.eventId,
        soldQty: sql<number>`coalesce(sum(${schema.ticket.qty}), 0)`,
      })
      .from(schema.ticket)
      .where(
        and(
          inArray(
            schema.ticket.eventId,
            events.map((event) => event.id),
          ),
          eq(schema.ticket.valid, true),
        ),
      )
      .groupBy(schema.ticket.eventId);

    const soldMap = new Map(
      soldByEvent.map((entry) => [entry.eventId, entry.soldQty]),
    );

    return {
      ok: true,
      data: events.map((event) => ({
        ...event,
        soldTickets: soldMap.get(event.id) ?? 0,
        hasIssuedTickets: event.ticketCount > 0,
      })),
    };
  })
  .delete(
    "/:id",
    async ({ params, request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return { ok: false, message: "Unauthorized!" };
      }

      const [event] = await db
        .select({
          id: schema.event.id,
          creatorId: schema.event.creatorId,
          ticketCount: sql<number>`count(${schema.ticket.id})`,
        })
        .from(schema.event)
        .leftJoin(schema.ticket, eq(schema.ticket.eventId, schema.event.id))
        .where(eq(schema.event.id, params.id))
        .groupBy(schema.event.id)
        .limit(1);

      if (!event) {
        return { ok: false, message: "Event not found!" };
      }

      if (event.creatorId !== session.user.id) {
        return {
          ok: false,
          message: "Sign in from correct email!",
        };
      }

      if (event.ticketCount > 0) {
        return {
          ok: false,
          message: "Cannot delete an event after tickets have been issued",
        };
      }

      await db.delete(schema.event).where(eq(schema.event.id, params.id));

      return { ok: true, data: { id: params.id } };
    },
    {
      params: t.Object({ id: t.String() }),
    },
  )
  .get(
    "/slug/:slug",
    async ({ params }) => {
      const [event] = await db
        .select()
        .from(schema.event)
        .where(eq(schema.event.slug, params.slug))
        .limit(1);

      if (!event) {
        return { ok: false, message: "Event not exist!" };
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
      const [event] = await db
        .select({ id: schema.event.id })
        .from(schema.event)
        .where(eq(schema.event.slug, params.slug))
        .limit(1);
      return { ok: true, exists: !!event };
    },
    {
      params: t.Object({ slug: t.String() }),
    },
  )
  .get(
    "/tickets/:slug",
    async ({ params, query, request }) => {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user) {
        return { ok: false, message: "Unauthorised!" };
      }

      const [event] = await db
        .select({
          id: schema.event.id,
          totalTickets: schema.event.totalTickets,
          title: schema.event.title,
          startDate: schema.event.startDate,
          endDate: schema.event.endDate,
          location: schema.event.location,
          creatorId: schema.event.creatorId,
        })
        .from(schema.event)
        .where(eq(schema.event.slug, params.slug))
        .limit(1);

      if (!event) {
        return { ok: false, message: "Event not exist!" };
      }

      if (event.creatorId !== session.user.id) {
        return { ok: false, message: "Sign in from correct email!" };
      }

      const ticketFilters = [eq(schema.ticket.eventId, event.id)];
      if (query.query.trim().length > 0) {
        ticketFilters.push(ilike(schema.user.name, `%${query.query.trim()}%`));
      }

      const [{ count: totalTicketCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.ticket)
        .leftJoin(schema.user, eq(schema.user.id, schema.ticket.userId))
        .where(and(...ticketFilters));

      const data = await db
        .select({
          id: schema.ticket.id,
          tierName: schema.ticket.tierName,
          qty: schema.ticket.qty,
          unitPrice: schema.ticket.unitPrice,
          valid: schema.ticket.valid,
          createdAt: schema.ticket.createdAt,
          user: {
            name: schema.user.name,
            email: schema.user.email,
          },
        })
        .from(schema.ticket)
        .leftJoin(schema.user, eq(schema.user.id, schema.ticket.userId))
        .where(and(...ticketFilters))
        .orderBy(resolveTicketOrderBy(query.filter))
        .limit(query.limit)
        .offset(query.offset);

      const [eventStats] = await db
        .select({
          soldCount: sql<number>`coalesce(sum(case when ${schema.ticket.valid} then ${schema.ticket.qty} else 0 end), 0)`,
          grossRevenue: sql<number>`coalesce(sum(case when ${schema.ticket.valid} then ${schema.ticket.qty} * ${schema.ticket.unitPrice} else 0 end), 0)`,
          invalidEntries: sql<number>`coalesce(sum(case when ${schema.ticket.valid} then 0 else 1 end), 0)`,
        })
        .from(schema.ticket)
        .where(eq(schema.ticket.eventId, event.id));

      const soldCount = eventStats?.soldCount ?? 0;
      const grossRevenue = eventStats?.grossRevenue ?? 0;
      const remaining = Math.max(event.totalTickets - soldCount, 0);
      const soldPercent =
        event.totalTickets > 0 ? (soldCount / event.totalTickets) * 100 : 0;
      const avgTicketPrice = soldCount > 0 ? grossRevenue / soldCount : 0;
      const invalidEntries = eventStats?.invalidEntries ?? 0;

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
          order: t.Union([
            t.Literal("asc"),
            t.Literal("desc"),
            t.Literal("dsc"),
          ]),
        }),
      }),
      params: t.Object({ slug: t.String() }),
    },
  )
  // .use(rateLimit())
  .get(
    "/",
    async ({ query }) => {
      const where = {
        title: query.query ? `%${query.query}%` : undefined,
        // status: "LIVE" as const,
      };

      const whereClause = where.title
        ? ilike(schema.event.title, where.title)
        : undefined;

      const [{ count: totalCount }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.event)
        .where(whereClause);

      const data = await db
        .select({
          title: schema.event.title,
          slug: schema.event.slug,
          startDate: schema.event.startDate,
          location: schema.event.location,
          posterImage: schema.event.posterImage,
          genre: schema.event.genre,
          status: schema.event.status,
        })
        .from(schema.event)
        .where(whereClause)
        .orderBy(asc(schema.event.startDate))
        .limit(query.limit)
        .offset(query.offset);

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
  );
