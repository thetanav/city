import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage the events you have created.
          </p>
        </div>
        <Button render={<Link href="/events/new" />} className="gap-2">
          <Plus className="size-4" />
          Create new event
        </Button>
      </section>

      {events.length === 0 ? (
        <section>
          <Card>
            <CardContent className="flex items-center justify-center py-10">
              <div className="text-center space-y-2">
                <Plus className="mx-auto size-6 text-muted-foreground" />
                <p className="text-sm font-medium">No events yet</p>
                <p className="text-sm text-muted-foreground">
                  Create your first event to see it here.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <Link key={event.id} href={`/dashboard/${event.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="space-y-3 py-5">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      {new Date(event.startDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="font-semibold tracking-tight line-clamp-1">
                      {event.title}
                    </p>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {event.location}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tickets</span>
                    <span className="font-medium">
                      {event._count.tickets} / {event.totalTickets}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
