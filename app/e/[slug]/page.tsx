"use client";

import { use, useEffect, useMemo, useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CornerDownRight,
  ExternalLink,
  Mail,
  MapPin,
  Ticket,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

import DynamicImg from "@/components/dynimg";
import { Empty, Error, Loading } from "@/components/states";
import { TicketBookingSheetContent } from "@/components/ticket-booking-sheet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toastManager } from "@/components/ui/toast";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/eden";
import {
  buildMapEmbedUrl,
  buildMapSearchUrl,
  normalizeEventTiers,
} from "@/lib/ticketing";
import { cn } from "@/lib/utils";

type EventStatus = "DRAFT" | "LIVE" | "STOPPED";

type PageProps = {
  params: Promise<{ slug: string }>;
};

type EventTiming = {
  start: Date;
  end: Date;
  hasStarted: boolean;
  hasEnded: boolean;
  remainingDays: number;
  remainingHours: number;
  remainingMinutes: number;
  remainingSeconds: number;
  whenLabel: string;
  untilLabel: string | null;
  countdownTitle: string;
  countdownDescription: string;
};

const EVENT_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const EVENT_END_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function getEventTiming(event: any, now: Date): EventTiming {
  const start = new Date(event.startDate);
  const end = new Date(event.endDate ?? event.startDate);
  const remainingMs = Math.max(0, start.getTime() - now.getTime());
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const remainingMinutes = Math.floor((remainingMs / (1000 * 60)) % 60);
  const remainingSeconds = Math.floor((remainingMs / 1000) % 60);
  const hasStarted = now >= start;
  const hasEnded = now > end;

  return {
    start,
    end,
    hasStarted,
    hasEnded,
    remainingDays,
    remainingHours,
    remainingMinutes,
    remainingSeconds,
    whenLabel: EVENT_DATE_FORMATTER.format(start),
    untilLabel: event.endDate === null ? null : EVENT_END_FORMATTER.format(end),
    countdownTitle: hasEnded
      ? "Event ended"
      : hasStarted
        ? "Happening now"
        : "Event starts in",
    countdownDescription: hasEnded
      ? "Ticket sales are closed."
      : hasStarted
        ? "This event is currently underway."
        : `${remainingDays} ${remainingDays === 1 ? "day" : "days"} left`,
  };
}

function getEventBanner(status: EventStatus) {
  if (status === "STOPPED") {
    return {
      className: "border-yellow-300 bg-yellow-50 text-yellow-900",
      message: "Ticket sales for this event are currently unavailable.",
    };
  }

  if (status === "DRAFT") {
    return {
      className: "border-slate-300 bg-slate-50 text-slate-700",
      message: "This event is not live yet.",
    };
  }

  return null;
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

function CountdownPanel({ timing }: { timing: EventTiming }) {
  return (
    <div className="rounded-xl bg-card p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">{timing.countdownTitle}</p>
        <p className="text-sm text-muted-foreground">
          {timing.countdownDescription}
        </p>
      </div>

      {timing.hasEnded ? (
        <p className="mt-4 text-sm text-muted-foreground">
          This experience is no longer accepting bookings.
        </p>
      ) : timing.hasStarted ? (
        <p className="mt-4 text-sm text-muted-foreground">
          The event has started. Any remaining tickets can still be purchased
          while sales are open.
        </p>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-3xl font-black tabular-nums">
          <NumberFlow
            value={timing.remainingHours}
            format={{ minimumIntegerDigits: 2 }}
          />
          <span>:</span>
          <NumberFlow
            value={timing.remainingMinutes}
            format={{ minimumIntegerDigits: 2 }}
          />
          <span>:</span>
          <NumberFlow
            value={timing.remainingSeconds}
            format={{ minimumIntegerDigits: 2 }}
          />
        </div>
      )}
    </div>
  );
}

export default function Page({ params }: PageProps) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [now, setNow] = useState(() => new Date());

  const {
    data: event,
    isPending,
    isError,
    isSuccess,
  } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const response = await api.events.slug({ slug }).get();

      if (response.status === 404 || !response.data?.data) {
        toastManager.add({ title: "Event not found" });
        return null;
      }
      console.log(response.data.data.image);
      return response.data.data;
    },
  });

  useEffect(() => {
    if (!event?.startDate) return;

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [event?.startDate]);

  const payment = searchParams.get("payment");

  const paymentNotice = useMemo(() => {
    if (!isSuccess) return null;

    if (payment === "success") {
      return {
        status: "success" as const,
        message:
          "Payment confirmed. Your tickets are being prepared and a confirmation email is on the way.",
      };
    }

    if (payment === "cancel") {
      return {
        status: "error" as const,
        message: "Payment was cancelled. No tickets were issued.",
      };
    }

    return null;
  }, [isSuccess, payment]);

  const derived = useMemo(() => {
    if (!event) return null;

    const timing = getEventTiming(event, now);
    const tiers = normalizeEventTiers(event.prices, event.totalTickets);
    const soldOut =
      tiers.length > 0
        ? tiers.every((tier) => tier.seats <= 0)
        : event.totalTickets <= 0;
    const checkoutOpen =
      event.status === "LIVE" && !timing.hasEnded && !soldOut;
    const checkoutLabel = !checkoutOpen
      ? timing.hasEnded
        ? "Event ended"
        : soldOut
          ? "Sold out"
          : "Sales unavailable"
      : !session?.user
        ? "Sign in to book tickets"
        : "Book tickets";

    return {
      timing,
      soldOut,
      checkoutOpen,
      checkoutLabel,
      mapsHref: buildMapSearchUrl(event.location),
      embedMapHref: buildMapEmbedUrl(event.location),
      banner: getEventBanner(event.status),
    };
  }, [event, now, session?.user]);

  if (isPending) {
    return <Loading />;
  }

  if (isError) {
    return <Error />;
  }

  if (!event || !derived) {
    return <Empty />;
  }

  return (
    <div className="space-y-6">
      {derived.banner ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm font-medium",
            derived.banner.className,
          )}>
          {derived.banner.message}
        </div>
      ) : null}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {event.title}
        </h1>
      </div>

      <div className="flex gap-1">
        <div className="flex max-w-[20rem] items-center justify-center overflow-hidden rounded-xl border bg-muted/20 shadow">
          <DynamicImg
            alt={`${event.title} cover`}
            className="h-full w-full"
            classImg="object-contain"
            src={event.image![0]}
          />
        </div>
        <div className="w-fit grid grid-cols-2 gap-1">
          {event.image?.slice(1) &&
            event.image
              ?.slice(1)
              .map((img, index) => (
                <DynamicImg
                  key={index}
                  alt={`${event.title} cover`}
                  classImg="rounded-xl border contain"
                  src={img}
                />
              ))}
        </div>
      </div>

      {paymentNotice ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            paymentNotice.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          )}>
          {paymentNotice.message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoRow icon={<CalendarDays className="size-4" />} label="When">
          <p>{derived.timing.whenLabel}</p>
          {derived.timing.untilLabel ? (
            <p className="inline-flex items-center gap-1">
              <CornerDownRight className="size-4 opacity-60" />
              <span>{derived.timing.untilLabel}</span>
            </p>
          ) : null}
        </InfoRow>

        <InfoRow icon={<MapPin className="size-4" />} label="Where">
          <p>{event.location}</p>
        </InfoRow>

        {event.contactEmail ? (
          <InfoRow icon={<Mail className="size-4" />} label="Contact">
            <a href={`mailto:${event.contactEmail}`}>{event.contactEmail}</a>
          </InfoRow>
        ) : null}

        <InfoRow icon={<Ticket className="size-4" />} label="Remaining tickets">
          <p>{event.totalTickets}</p>
        </InfoRow>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.25fr_.85fr]">
        <div className="grid gap-3">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <Markdown remarkPlugins={[remarkGfm]}>
                {event.description}
              </Markdown>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Venue</CardTitle>
              <CardDescription>
                Check the map and plan your route.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="overflow-hidden rounded-lg">
                <iframe
                  width="100%"
                  height="300"
                  src={derived.embedMapHref}
                  loading="lazy"
                  title={`${event.title} venue map`}
                />
              </div>
              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <a href={derived.mapsHref} target="_blank" rel="noreferrer">
                    Open in Maps
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3">
          <CountdownPanel timing={derived.timing} />

          <Sheet>
            <SheetTrigger asChild>
              <Button className="w-full" disabled={!derived.checkoutOpen}>
                {derived.checkoutLabel}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-lg">
              <TicketBookingSheetContent
                event={event}
                slug={slug}
                checkoutOpen={derived.checkoutOpen}
                hasEnded={derived.timing.hasEnded}
                soldOut={derived.soldOut}
              />
            </SheetContent>
          </Sheet>

          <p className="px-1 text-xs text-muted-foreground">
            By purchasing a ticket, you agree to follow the event safety
            guidelines and policies.
          </p>
        </div>
      </div>
    </div>
  );
}
