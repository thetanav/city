"use client";

import * as React from "react";
import {
  Ticket as TicketIcon,
  Calendar,
  MapPin,
  Clock,
  ChevronRight,
  User2,
  ExternalLink,
  QrCode,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Link from "next/link";
import { motion, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function HomePage({
  user,
  tickets,
}: {
  user: HomePageUser | null;
  tickets: TicketData[];
}) {
  const [activeTicket, setActiveTicket] = React.useState<TicketData | null>(null);

  if (!user) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center"
      >
        <div className="max-w-md space-y-6">
          <div className="relative inline-flex items-center justify-center">
             <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
             <TicketIcon className="relative size-16 text-primary mb-2" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Your Gateway to the Best Events
          </h1>
          <p className="text-lg text-muted-foreground">
            Sign in to access your tickets, manage your events, and explore
            what&apos;s happening in your city.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/explore">
              <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/25">
                Explore Events
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Header */}
      <motion.section 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-6"
      >
        <div className="space-y-1">
          <Badge variant="secondary" className="mb-2 px-3 py-1 text-xs font-medium bg-primary/10 text-primary border-none">
            Member Dashboard
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">
            Hey, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            You have {tickets.length} upcoming {tickets.length === 1 ? 'experience' : 'experiences'}.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard">
            <Button
              variant="outline"
              size="lg"
              className="group active:scale-95 transition-all"
            >
              <User2 className="mr-2 size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              Manage Events
            </Button>
          </Link>
          <Link href="/explore">
            <Button
              size="lg"
              className="shadow-md"
            >
              Find More
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Tickets */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TicketIcon className="size-6 text-primary" />
            Your Tickets
          </h2>
          {tickets.length > 0 && (
            <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded-md">
              {tickets.length} Total
            </span>
          )}
        </div>

        {tickets.length > 0 ? (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-2"
          >
            {tickets.map((ticket) => (
              <motion.div key={ticket.id} variants={item}>
                <TicketCard
                  ticket={ticket}
                  onClick={() => setActiveTicket(ticket)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-dashed border-2 bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="bg-background p-4 rounded-full shadow-sm border">
                  <TicketIcon className="size-10 text-muted-foreground/50" />
                </div>
                <div className="max-w-xs space-y-2">
                  <h3 className="text-xl font-bold">No tickets yet</h3>
                  <p className="text-muted-foreground">
                    Your upcoming event tickets will appear here once you purchase
                    them.
                  </p>
                </div>
                <Link href="/explore">
                  <Button variant="default" className="mt-2 group">
                    Find your first event 
                    <ChevronRight className="ml-1 size-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </section>

      {/* Ticket Details Dialog */}
      <Dialog open={!!activeTicket} onOpenChange={(open) => !open && setActiveTicket(null)}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
          {activeTicket && (
            <div className="relative">
              {/* Event Banner */}
              <div className="relative h-48 w-full bg-muted">
                {activeTicket.event.posterImage ? (
                  <img
                    src={activeTicket.event.posterImage}
                    alt={activeTicket.event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <TicketIcon className="size-12 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                <Badge className="absolute top-4 left-4 bg-primary text-primary-foreground font-bold shadow-lg">
                  {activeTicket.tierName}
                </Badge>
              </div>

              <div className="p-6 pt-0 relative -mt-12">
                <div className="bg-background rounded-xl border p-6 shadow-sm space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold leading-tight">
                      {activeTicket.event.title}
                    </h2>
                    {activeTicket.valid === false && (
                      <Badge variant="destructive" className="mt-1">
                        Invalidated by organizer
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <Calendar className="size-4 text-primary mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold">Date</p>
                        <p className="text-muted-foreground">
                          {new Intl.DateTimeFormat("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          }).format(new Date(activeTicket.event.startDate))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Clock className="size-4 text-primary mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold">Time</p>
                        <p className="text-muted-foreground">
                          {new Intl.DateTimeFormat("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }).format(new Date(activeTicket.event.startDate))}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 col-span-2">
                      <MapPin className="size-4 text-primary mt-0.5 shrink-0" />
                      <div className="text-sm">
                        <p className="font-semibold">Location</p>
                        <p className="text-muted-foreground line-clamp-1">
                          {activeTicket.event.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-xl border border-dashed gap-4">
                    <div className="bg-white p-4 rounded-xl shadow-inner border">
                      <QRCodeSVG value={activeTicket.id} size={160} level="H" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        Ticket ID: {activeTicket.id.slice(0, 8)}...
                      </p>
                      <p className="text-sm font-bold">
                        Qty: {activeTicket.qty} Adult Admission
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setActiveTicket(null)}
                    >
                      Close
                    </Button>
                    <Link
                      href={`/e/${activeTicket.event.slug}`}
                      className="flex-1"
                    >
                      <Button className="w-full gap-2">
                        Event Page <ExternalLink className="size-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      type="button"
      className="text-left w-full group focus-visible:outline-none"
      onClick={onClick}
    >
      <Card className="overflow-hidden border-2 border-transparent group-hover:border-primary/20 transition-all duration-300 shadow-sm group-hover:shadow-md h-full">
        <div className="flex h-full min-h-[140px]">
          {/* Left Side: Image/Banner */}
          <div className="w-32 relative bg-muted shrink-0 overflow-hidden">
            {ticket.event.posterImage ? (
              <img
                src={ticket.event.posterImage}
                alt={ticket.event.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <TicketIcon className="size-8 text-muted-foreground/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
            <div className="absolute top-2 left-2">
              <Badge className="bg-background/90 text-foreground text-[10px] font-bold h-5 px-1.5 backdrop-blur-sm border-none">
                {ticket.qty}x
              </Badge>
            </div>
          </div>

          {/* Right Side: Info */}
          <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary truncate">
                  {ticket.tierName}
                </p>
                {ticket.valid === false && (
                  <Badge variant="destructive" className="h-4 text-[9px] px-1 capitalize">
                    Invalid
                  </Badge>
                )}
              </div>
              <h3 className="font-bold text-lg leading-tight truncate group-hover:text-primary transition-colors">
                {ticket.event.title}
              </h3>
            </div>

            <div className="space-y-2.5 mt-2">
              <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Calendar className="size-3.5 text-primary/70" />
                  <span>{dateStr}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 border-l pl-4">
                  <Clock className="size-3.5 text-primary/70" />
                  <span>{timeStr}</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-primary/70 shrink-0" />
                <span className="truncate">{ticket.event.location}</span>
              </div>
            </div>
          </div>

          {/* Far Right: QR Peek */}
          <div className="w-16 border-l border-dashed flex flex-col items-center justify-center bg-muted/20 group-hover:bg-primary/5 transition-colors p-2 shrink-0">
            <QrCode className="size-6 text-muted-foreground/40 group-hover:text-primary/60 transition-colors mb-1" />
            <span className="text-[8px] font-bold text-muted-foreground/60 group-hover:text-primary/60 uppercase tracking-tighter">
              View Code
            </span>
          </div>
        </div>
      </Card>
    </motion.button>
  );
}
