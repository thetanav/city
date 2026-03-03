import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatDate(value: Date) {
  return value.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function EventDashboardPage({ params }: PageProps) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/auth");
  }

  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: {
      id,
      creatorId: session.user.id,
    },
    include: {
      tickets: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  const soldCount = event.tickets.reduce(
    (acc, ticket) => acc + (ticket.valid ? ticket.qty : 0),
    0,
  );
  const grossRevenue = event.tickets.reduce(
    (acc, ticket) => acc + (ticket.valid ? ticket.qty * ticket.unitPrice : 0),
    0,
  );
  const remaining = Math.max(event.totalTickets - soldCount, 0);
  const soldPercent =
    event.totalTickets > 0 ? (soldCount / event.totalTickets) * 100 : 0;
  const avgTicketPrice = soldCount > 0 ? grossRevenue / soldCount : 0;
  const invalidEntries = event.tickets.filter((ticket) => !ticket.valid).length;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground">
          Back to dashboard
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(event.startDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            at {event.location}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Sold</CardDescription>
            <CardTitle>{soldCount}</CardTitle>
          </CardHeader>
          <CardPanel className="pt-0 text-sm text-muted-foreground">
            of {event.totalTickets} tickets
          </CardPanel>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Profit</CardDescription>
            <CardTitle>{formatMoney(grossRevenue)}</CardTitle>
          </CardHeader>
          <CardPanel className="pt-0 text-sm text-muted-foreground">
            gross ticket revenue
          </CardPanel>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Remaining</CardDescription>
            <CardTitle>{remaining}</CardTitle>
          </CardHeader>
          <CardPanel className="pt-0 text-sm text-muted-foreground">
            {soldPercent.toFixed(1)}% sold
          </CardPanel>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Average Ticket Price</CardDescription>
            <CardTitle>{formatMoney(avgTicketPrice)}</CardTitle>
          </CardHeader>
          <CardPanel className="pt-0 text-sm text-muted-foreground">
            {event.tickets.length} records, {invalidEntries} invalid
          </CardPanel>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>
              Complete purchase records for this event.
            </CardDescription>
          </CardHeader>
          <CardPanel>
            {event.tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tickets sold yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="py-3 pr-4 font-medium">Ticket</th>
                      <th className="py-3 pr-4 font-medium">Buyer</th>
                      <th className="py-3 pr-4 font-medium">Tier</th>
                      <th className="py-3 pr-4 font-medium">Qty</th>
                      <th className="py-3 pr-4 font-medium">Unit Price</th>
                      <th className="py-3 pr-4 font-medium">Total</th>
                      <th className="py-3 pr-4 font-medium">Status</th>
                      <th className="py-3 pr-0 font-medium">Purchased</th>
                    </tr>
                  </thead>
                  <tbody>
                    {event.tickets.map((ticket) => {
                      const buyer =
                        ticket.user?.name ??
                        ticket.user?.email ??
                        "Guest checkout";

                      return (
                        <tr key={ticket.id} className="border-b last:border-0">
                          <td className="py-3 pr-4 font-mono text-xs">
                            {ticket.id.slice(0, 10)}...
                          </td>
                          <td className="py-3 pr-4">{buyer}</td>
                          <td className="py-3 pr-4">{ticket.tierName}</td>
                          <td className="py-3 pr-4">{ticket.qty}</td>
                          <td className="py-3 pr-4">
                            {formatMoney(ticket.unitPrice)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatMoney(ticket.qty * ticket.unitPrice)}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge
                              variant={ticket.valid ? "success" : "destructive"}
                              size="sm">
                              {ticket.valid ? "Valid" : "Invalid"}
                            </Badge>
                          </td>
                          <td className="py-3 pr-0">
                            {formatDate(ticket.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardPanel>
        </Card>
      </section>
    </div>
  );
}
