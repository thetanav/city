"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  ExternalLink,
  MapPin,
  QrCode,
  Ticket as TicketIcon,
  User2,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";

import DynamicImg from "@/components/dynimg";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TicketData = {
  id: string;
  tierName: string;
  qty: number;
  createdAt: string;
  valid?: boolean | null;
  event: {
    id: string;
    slug: string;
    title: string;
    startDate: string;
    location: string;
    posterImage: string | null;
  };
};

type HomePageUser = {
  name: string;
  email?: string | null;
  image?: string | null;
};

function formatTicketDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTicketTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatPurchaseDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function firstName(name: string) {
  const [first] = name.trim().split(/\s+/);
  return first || "there";
}

export default function HomePage({
  user,
  tickets,
}: {
  user: HomePageUser | null;
  tickets: TicketData[];
}) {
  const [activeTicket, setActiveTicket] = React.useState<TicketData | null>(null);
  const validTickets = tickets.filter((ticket) => ticket.valid !== false);
  const upcomingTickets = [...validTickets].sort(
    (left, right) =>
      new Date(left.event.startDate).getTime() - new Date(right.event.startDate).getTime(),
  );
  const nextTicket = upcomingTickets[0] ?? null;

  if (!user) {
    return (
      <Card>
        <CardContent className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Keep your tickets in one place
            </h1>
            <p className="max-w-md text-sm text-muted-foreground sm:text-base">
              Sign in to view upcoming bookings and manage the events you run.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/explore">Explore events</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/auth">Sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-3xl">Welcome back, {firstName(user.name)}.</CardTitle>
            <CardDescription>
              Your upcoming tickets and organizer shortcuts live here.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <User2 className="size-4" />
                Manage events
              </Link>
            </Button>
            <Button asChild>
              <Link href="/explore">Find more</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold">{tickets.length}</p>
            <p className="text-sm text-muted-foreground">Tickets</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{validTickets.length}</p>
            <p className="text-sm text-muted-foreground">Ready to scan</p>
          </div>
          <div>
            <p className="truncate text-lg font-semibold">
              {nextTicket ? nextTicket.event.title : "Nothing booked"}
            </p>
            <p className="text-sm text-muted-foreground">Next event</p>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Upcoming tickets</h2>
          {tickets.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              Purchased since {formatPurchaseDate(tickets[tickets.length - 1].createdAt)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Your purchases will show up here.</p>
          )}
        </div>

        {tickets.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} onClick={() => setActiveTicket(ticket)} ticket={ticket} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold">No tickets yet</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Pick an event and complete checkout to see tickets here.
                </p>
              </div>
              <Button asChild>
                <Link href="/explore">Find your first event</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      <Dialog onOpenChange={(open) => !open && setActiveTicket(null)} open={!!activeTicket}>
        <DialogContent className="max-w-xl">
          {activeTicket ? (
            <TicketDetails onClose={() => setActiveTicket(null)} ticket={activeTicket} />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TicketDetails({ ticket, onClose }: { ticket: TicketData; onClose: () => void }) {
  return (
    <div className="space-y-6">
      {ticket.event.posterImage ? (
        <div className="overflow-hidden rounded-lg border">
          <DynamicImg
            alt={`${ticket.event.title} poster`}
            className="aspect-[16/9] w-full"
            src={ticket.event.posterImage}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Badge variant="secondary" className="w-fit">
          {ticket.tierName}
        </Badge>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold">{ticket.event.title}</h2>
          {ticket.valid === false ? (
            <Badge variant="destructive">Invalidated by organizer</Badge>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailRow
          icon={<Calendar className="size-4 text-muted-foreground" />}
          label="Date"
          value={formatTicketDay(ticket.event.startDate)}
        />
        <DetailRow
          icon={<Clock className="size-4 text-muted-foreground" />}
          label="Time"
          value={formatTicketTime(ticket.event.startDate)}
        />
        <DetailRow
          className="sm:col-span-2"
          icon={<MapPin className="size-4 text-muted-foreground" />}
          label="Location"
          value={ticket.event.location}
        />
      </div>

      <div className="rounded-lg border border-dashed p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-lg border bg-background p-4">
            <QRCodeSVG level="H" size={168} value={ticket.id} />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {ticket.qty} admission{ticket.qty === 1 ? "" : "s"}
            </p>
            <p className="text-sm text-muted-foreground">
              Ticket ID {ticket.id.slice(0, 8)} · bought {formatPurchaseDate(ticket.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild className="w-full">
          <Link href={`/e/${ticket.event.slug}`}>
            Event page
            <ExternalLink className="size-4" />
          </Link>
        </Button>
        <Button className="w-full" onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    </div>
  );
}

function DetailRow({
  className,
  icon,
  label,
  value,
}: {
  className?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onClick }: { ticket: TicketData; onClick: () => void }) {
  const dateText = formatTicketDay(ticket.event.startDate);
  const timeText = formatTicketTime(ticket.event.startDate);

  return (
    <button className="w-full text-left" onClick={onClick} type="button">
      <Card className="h-full transition-colors hover:border-ring/60">
        <div className="overflow-hidden rounded-t-2xl border-b bg-muted/40">
          {ticket.event.posterImage ? (
            <DynamicImg
              alt={`${ticket.event.title} poster`}
              className="aspect-[16/9] w-full"
              src={ticket.event.posterImage}
            />
          ) : (
            <div className="flex aspect-[16/9] items-center justify-center">
              <TicketIcon className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{ticket.tierName}</p>
              <CardTitle className="text-2xl">{ticket.event.title}</CardTitle>
            </div>
            {ticket.valid === false ? (
              <Badge variant="destructive">Invalid</Badge>
            ) : (
              <Badge variant="outline">Ready</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="size-4" />
            <span>{dateText}</span>
            <Clock className="ml-2 size-4" />
            <span>{timeText}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4" />
            <span className="line-clamp-1">{ticket.event.location}</span>
          </div>
        </CardContent>

        <CardFooter className="justify-between text-sm">
          <span className="text-muted-foreground">
            Purchased {formatPurchaseDate(ticket.createdAt)}
          </span>
          <span className="inline-flex items-center gap-2 font-medium">
            View QR
            <QrCode className="size-4" />
          </span>
        </CardFooter>
      </Card>
    </button>
  );
}
