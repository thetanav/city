"use client";

import * as React from "react";
import {
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  Plus,
  X,
  User2,
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
  const [activeTicket, setActiveTicket] = React.useState<TicketData | null>(
    null,
  );

  React.useEffect(() => {
    if (!activeTicket) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveTicket(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTicket]);

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
          <Link href="/events/my">
            <Button
              variant="outline"
              className="active:scale-95 transition-transform">
              <User2 className="mr-2 size-4" />
              My Events
            </Button>
          </Link>
        </div>
      </section>

      {/* Tickets */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">All Tickets</h2>

        {tickets.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => setActiveTicket(ticket)}
              />
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
                  Find your first event <ChevronRight className="ml-1 size-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {activeTicket && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          role="dialog"
          aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close ticket details"
            onClick={() => setActiveTicket(null)}
          />
          <div className="relative z-10 w-full max-w-lg">
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle>Ticket details</CardTitle>
                <CardDescription>
                  Show this QR code at the entrance.
                </CardDescription>
              </CardHeader>
              <button
                type="button"
                className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground transition hover:text-foreground"
                aria-label="Close"
                onClick={() => setActiveTicket(null)}>
                <X className="size-4" />
              </button>
              <CardContent className="grid gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {activeTicket.tierName}
                    </p>
                    <p className="text-lg font-semibold">
                      {activeTicket.event.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(activeTicket.event.startDate))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {activeTicket.event.location}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {activeTicket.qty}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-md shadow-sm">
                    <QRCodeSVG value={activeTicket.id} size={120} />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTicket(null)}>
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function TicketCard({
  ticket,
  onClick,
}: {
  ticket: TicketData;
  onClick: () => void;
}) {
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
    <button
      type="button"
      className="text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      onClick={onClick}>
      <Card className="hover:bg-muted/50 transition-colors">
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
              <p className="text-xs text-muted-foreground">{ticket.tierName}</p>
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
    </button>
  );
}
