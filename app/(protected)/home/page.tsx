import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import HomePage from "@/components/home-page";
import { prisma } from "@/lib/prisma";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const tickets = await prisma.ticket.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      tierName: true,
      qty: true,
      createdAt: true,
      valid: true,
      event: {
        select: {
          id: true,
          title: true,
          startDate: true,
          location: true,
          posterImage: true,
        },
      },
    },
  });

  const mappedTickets = tickets.map((ticket) => ({
    id: ticket.id,
    tierName: ticket.tierName,
    qty: ticket.qty,
    createdAt: ticket.createdAt.toISOString(),
    valid: ticket.valid,
    event: {
      id: ticket.event.id,
      title: ticket.event.title,
      startDate: ticket.event.startDate.toISOString(),
      location: ticket.event.location,
      posterImage: ticket.event.posterImage,
    },
  }));

  return <HomePage user={session.user} tickets={mappedTickets} />;
}
