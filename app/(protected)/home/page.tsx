import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { desc, eq } from "drizzle-orm";
import HomePage from "@/components/home-page";
import { db, schema } from "@/db";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const tickets = await db
    .select({
      id: schema.ticket.id,
      tierName: schema.ticket.tierName,
      qty: schema.ticket.qty,
      createdAt: schema.ticket.createdAt,
      valid: schema.ticket.valid,
      eventId: schema.event.id,
      eventSlug: schema.event.slug,
      eventTitle: schema.event.title,
      eventStartDate: schema.event.startDate,
      eventLocation: schema.event.location,
      eventPosterImage: schema.event.posterImage,
    })
    .from(schema.ticket)
    .innerJoin(schema.event, eq(schema.event.id, schema.ticket.eventId))
    .where(eq(schema.ticket.userId, session.user.id))
    .orderBy(desc(schema.ticket.createdAt));

  const mappedTickets = tickets.map((ticket) => ({
    id: ticket.id,
    tierName: ticket.tierName,
    qty: ticket.qty,
    createdAt: ticket.createdAt.toISOString(),
    valid: ticket.valid,
    event: {
      id: ticket.eventId,
      slug: ticket.eventSlug,
      title: ticket.eventTitle,
      startDate: ticket.eventStartDate.toISOString(),
      location: ticket.eventLocation,
      posterImage: ticket.eventPosterImage,
    },
  }));

  return <HomePage user={session.user} tickets={mappedTickets} />;
}
