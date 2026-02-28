"use client";

import * as React from "react";
import {
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Plus,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

type TicketData = {
  id: string;
  tierName: string;
  qty: number;
  createdAt: string;
  event: {
    id: string;
    title: string;
    startDate: string;
    location: string;
    posterImage: string | null;
  };
};

export default function HomePage({
  user,
  tickets,
}: {
  user: any;
  tickets: TicketData[];
}) {

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 text-center">
        <div className="max-w-md space-y-6">
          <TicketIcon className="mx-auto size-12 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">
            Your Gateway to the Best Events
          </h1>
          <p className="text-muted-foreground">
            Sign in to access your tickets, manage your events, and explore
            what's happening in your city.
          </p>
          <Link href="/explore">
            <Button>Explore Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Hey, {user.name}
          </h1>
          <p className="text-muted-foreground mt-1">
            Ready for your next experience?
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/events/new">
            <Button variant="outline">
              <Plus className="mr-2 size-4" /> Create Event
            </Button>
          </Link>
          <Link href="/explore">
            <Button>Explore Events</Button>
          </Link>
        </div>
      </section>

      {/* Tickets */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My Tickets</h2>

        {tickets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <TicketIcon className="size-8 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">No tickets yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your upcoming event tickets will appear here once you purchase
                  them.
                </p>
              </div>
              <Link href="/explore">
                <Button variant="link" className="text-sm">
                  Find your first event{" "}
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* My Events */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">My Events</h2>
        <Link href="/dashboard">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="flex items-center justify-center py-10">
              <div className="text-center space-y-2">
                <Plus className="mx-auto size-6 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Manage your events in Dashboard
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </section>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: TicketData }) {
  const start = new Date(ticket.event.startDate);
  const dateStr = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(start);
  const timeStr = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);

  return (
    <Card>
      <CardContent className="flex gap-4 pt-6">
        {/* Event Image */}
        <div className="w-20 h-20 rounded-md overflow-hidden shrink-0 bg-muted">
          {ticket.event.posterImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ticket.event.posterImage}
              alt={ticket.event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TicketIcon className="size-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">
              {ticket.tierName}
            </p>
            <h3 className="font-semibold truncate">{ticket.event.title}</h3>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="size-3.5" />
              <span>{dateStr}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <span>{timeStr}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              <span className="truncate">{ticket.event.location}</span>
            </div>
          </div>
        </div>

        {/* QR */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="bg-white p-1.5 rounded-md">
            <QRCodeSVG value={ticket.id} size={48} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Qty: {ticket.qty}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
