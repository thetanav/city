import Link from "next/link";
import { ArrowRight, CalendarDays, Plus, Ticket } from "lucide-react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function statusVariant(status: string): "success" | "warning" | "outline" {
  if (status === "LIVE") return "success";
  if (status === "STOPPED") return "warning";
  return "outline";
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) return null;

  const events = await prisma.event.findMany({
    where: {
      creatorId: session.user.id,
    },
    include: {
      _count: {
        select: { tickets: true },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  const soldTickets = events.reduce((sum, event) => sum + event._count.tickets, 0);
  const liveEvents = events.filter((event) => event.status === "LIVE").length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-3xl">Organizer dashboard</CardTitle>
            <CardDescription>
              Review your events and ticket sales in one place.
            </CardDescription>
          </div>
          <Button render={<Link href="/events/new" />}>
            <Plus className="size-4" />
            Create event
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold">{events.length}</p>
            <p className="text-sm text-muted-foreground">Events</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{soldTickets}</p>
            <p className="text-sm text-muted-foreground">Tickets sold</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{liveEvents}</p>
            <p className="text-sm text-muted-foreground">Live now</p>
          </div>
        </CardContent>
      </Card>

      {events.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-60 flex-col items-center justify-center gap-4 text-center">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">No events yet</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                Create your first event to start tracking sales and attendees.
              </p>
            </div>
            <Button render={<Link href="/events/new" />}>
              Create your first event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 lg:grid-cols-2">
          {events.map((event) => (
            <Card key={event.id} render={<Link href={`/dashboard/${event.slug}`} />}>
              <CardHeader className="space-y-3">
                <Badge variant={statusVariant(event.status)} className="w-fit">
                  {event.status.toLowerCase()}
                </Badge>
                <div className="space-y-1">
                  <CardTitle className="text-2xl">{event.title}</CardTitle>
                  <CardDescription>{event.location}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="size-4" />
                  <span>{formatDate(new Date(event.startDate))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ticket className="size-4" />
                  <span>
                    {event._count.tickets} sold of {event.totalTickets}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="text-sm font-medium">
                View details
                <ArrowRight className="size-4" />
              </CardFooter>
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
