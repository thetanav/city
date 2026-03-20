"use client";

import { use, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CornerDownRight,
  ExternalLink,
  Mail,
  MapPin,
  Minus,
  Plus,
  Ticket,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import NumberFlow from "@number-flow/react";

import { Loading } from "@/components/states";
import DynamicImg from "@/components/dynimg";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastManager } from "@/components/ui/toast";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/eden";
import {
  buildMapEmbedUrl,
  buildMapSearchUrl,
  calculateServiceFee,
  formatMoney,
  MAX_SERVICE_FEE_MINOR,
  normalizeEventTiers,
} from "@/lib/ticketing";
import { cn } from "@/lib/utils";
import type { NormalizedEventTier } from "@/types/tier";

type EventStatus = "DRAFT" | "LIVE" | "STOPPED";

type EventDetails = {
  id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string;
  location: string;
  contactEmail: string | null;
  posterImage: string | null;
  prices: unknown;
  totalTickets: number;
  startDate: string;
  endDate: string | null;
  status: EventStatus;
};

type SelectedTier = NormalizedEventTier & { qty: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toIsoDate(value: unknown) {
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return null;
}

function normalizeEvent(value: unknown): EventDetails | null {
  if (!isRecord(value)) return null;

  const id = value.id;
  const title = value.title;
  const slug = value.slug;
  const description = value.description;
  const location = value.location;
  const totalTickets = value.totalTickets;
  const startDate = toIsoDate(value.startDate);
  const endDate =
    value.endDate === null || value.endDate === undefined ? null : toIsoDate(value.endDate);
  const status = value.status;

  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof slug !== "string" ||
    typeof description !== "string" ||
    typeof location !== "string" ||
    typeof totalTickets !== "number" ||
    !startDate ||
    (endDate === null && value.endDate !== null && value.endDate !== undefined)
  ) {
    return null;
  }

  return {
    id,
    title,
    slug,
    tagline: typeof value.tagline === "string" ? value.tagline : null,
    description,
    location,
    contactEmail: typeof value.contactEmail === "string" ? value.contactEmail : null,
    posterImage: typeof value.posterImage === "string" ? value.posterImage : null,
    prices: value.prices,
    totalTickets,
    startDate,
    endDate,
    status: status === "LIVE" || status === "STOPPED" || status === "DRAFT" ? status : "DRAFT",
  };
}

function extractCheckoutUrl(payload: unknown) {
  if (isRecord(payload) && typeof payload.url === "string") {
    return payload.url;
  }

  return null;
}

function checkoutStateMessage(event: EventDetails, hasEnded: boolean, soldOut: boolean) {
  if (hasEnded) return "This event has already ended.";
  if (soldOut) return "This event is sold out.";
  if (event.status !== "LIVE") return "Ticket sales are currently unavailable.";
  return "Pick your tickets";
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [now, setNow] = useState(() => new Date());
  const [selectionByEvent, setSelectionByEvent] = useState<Record<string, Record<string, number>>>(
    {},
  );

  const {
    data: event,
    isLoading,
    isSuccess,
  } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const response = await api.events.slug({ slug }).get();
      return normalizeEvent(response.data?.data);
    },
  });

  const tiers = useMemo(() => {
    if (!event) return [];
    return normalizeEventTiers(event.prices, event.totalTickets);
  }, [event]);

  useEffect(() => {
    if (!event?.startDate) return;

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [event?.startDate]);

  const eventKey = event?.slug ?? slug;
  const selections = useMemo(() => {
    return selectionByEvent[eventKey] ?? {};
  }, [eventKey, selectionByEvent]);

  const selectedTiers = useMemo<SelectedTier[]>(() => {
    return tiers
      .filter((tier) => (selections[tier.id] ?? 0) > 0)
      .map((tier) => ({ ...tier, qty: selections[tier.id] ?? 0 }));
  }, [tiers, selections]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!event || selectedTiers.length === 0) {
        throw new Error("Select at least one ticket.");
      }

      const { data, error } = await api.payments.checkout.post({
        eventId: event.id,
        tiers: selectedTiers.map(({ id, name, qty }) => ({ id, name, qty })),
      });

      if (error) {
        throw new Error("Failed to start checkout.");
      }

      const checkoutUrl = extractCheckoutUrl(data);
      if (!checkoutUrl) {
        throw new Error("Checkout session not available.");
      }

      return checkoutUrl;
    },
  });

  if (isLoading) return <Loading />;
  if (!event) return notFound();

  const payment = searchParams.get("payment");
  const paymentNotice =
    isSuccess && payment === "success"
      ? {
          status: "success" as const,
          message:
            "Payment confirmed. Your tickets are being prepared and a confirmation email is on the way.",
        }
      : isSuccess && payment === "cancel"
        ? {
            status: "error" as const,
            message: "Payment was cancelled. No tickets were issued.",
          }
        : null;

  const start = new Date(event.startDate);
  const end = new Date(event.endDate ?? event.startDate);
  const remainingMs = Math.max(0, start.getTime() - now.getTime());
  const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
  const remainingHours = Math.floor((remainingMs / (1000 * 60 * 60)) % 24);
  const remainingMinutes = Math.floor((remainingMs / (1000 * 60)) % 60);
  const remainingSeconds = Math.floor((remainingMs / 1000) % 60);
  const hasStarted = now >= start;
  const hasEnded = now > end;
  const soldOut =
    tiers.length > 0 ? tiers.every((tier) => tier.seats <= 0) : event.totalTickets <= 0;
  const checkoutOpen = event.status === "LIVE" && !hasEnded && !soldOut;

  const subtotal = selectedTiers.reduce((sum, tier) => sum + tier.price * tier.qty, 0);
  const fee = calculateServiceFee(subtotal);
  const total = subtotal + fee;
  const when = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);
  const until =
    event.endDate === null
      ? null
      : new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }).format(end);
  const countdownTitle = hasEnded
    ? "Event ended"
    : hasStarted
      ? "Happening now"
      : "Event starts in";
  const countdownDescription = hasEnded
    ? "Ticket sales are closed."
    : hasStarted
      ? "This event is currently underway."
      : `${remainingDays} ${remainingDays === 1 ? "day" : "days"} left`;
  const checkoutLabel = !checkoutOpen
    ? hasEnded
      ? "Event ended"
      : soldOut
        ? "Sold out"
        : "Sales unavailable"
    : !session?.user
      ? "Sign in to buy tickets"
      : checkoutMutation.isPending
        ? "Processing..."
        : "Buy tickets";
  const mapsHref = buildMapSearchUrl(event.location);

  function updateSelections(updater: (current: Record<string, number>) => Record<string, number>) {
    setSelectionByEvent((current) => ({
      ...current,
      [eventKey]: updater(current[eventKey] ?? {}),
    }));
  }

  async function onCheckout() {
    if (!checkoutOpen || selectedTiers.length === 0) return;

    if (!session?.user) {
      router.push(`/auth?next=${encodeURIComponent(`/e/${slug}`)}`);
      return;
    }

    try {
      const checkoutUrl = await checkoutMutation.mutateAsync();
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error(error);
      toastManager.add({
        title: "Failed to start checkout. Please try again.",
        type: "error",
      });
    }
  }

  return (
    <div className="space-y-6">
      {event.status == "STOPPED" && (
        <div className="border-y-2 border-yellow-600 bg-yellow-200 py-2 text-center italic underline">
          This event is still not available for buying
        </div>
      )}

      {event.status == "DRAFT" && (
        <div className="border-y-2 border-gray-600 bg-gray-200 py-2 text-center italic underline">
          This event is not live till yet
        </div>
      )}

      {event.posterImage && (
        <div className="overflow-hidden rounded-lg border">
          <DynamicImg
            alt={`${event.title} cover`}
            className="aspect-16/7 w-full"
            src={event.posterImage}
          />
        </div>
      )}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{event.title}</h1>
        {event.tagline ? <p className="mt-1 text-muted-foreground">{event.tagline}</p> : null}
      </div>

      {paymentNotice ? (
        <div
          className={cn(
            "rounded-lg border px-4 py-3 text-sm",
            paymentNotice.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          )}
        >
          {paymentNotice.message}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1.25fr_.85fr]">
        <div className="grid gap-3">
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>What you should know before you go.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">When</p>
                    <p className="text-sm font-medium">{when}</p>
                    {until ? (
                      <p className="inline-flex text-sm font-medium">
                        <CornerDownRight className="mr-1 size-4 opacity-60" />
                        {until}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Where</p>
                    <p className="text-sm font-medium">{event.location}</p>
                  </div>
                </div>
                {event.contactEmail ? (
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 size-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Contact</p>
                      <a className="text-sm font-medium" href={`mailto:${event.contactEmail}`}>
                        {event.contactEmail}
                      </a>
                    </div>
                  </div>
                ) : null}
                <div className="flex items-start gap-3">
                  <Ticket className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining tickets</p>
                    <p className="text-sm font-medium">{event.totalTickets}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-md mt-3 max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.description}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
              <CardDescription>Select a tier. Seats are limited.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {tiers.map((tier) => {
                const qty = selections[tier.id] ?? 0;
                const tierSoldOut = tier.seats <= 0;
                const maxQty = Math.max(0, Math.min(8, tier.seats));

                return (
                  <div
                    key={tier.id}
                    className={cn(
                      "rounded-lg border border-dashed p-4",
                      qty > 0 && "border-foreground/60",
                      tierSoldOut && "border-foreground/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{tier.name}</p>
                        {tier.note ? (
                          <p className="mt-1 text-xs text-muted-foreground">{tier.note}</p>
                        ) : null}
                        <p className="mt-1 text-sm font-semibold">{formatMoney(tier.price)}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              updateSelections((current) => ({
                                ...current,
                                [tier.id]: Math.max(0, (current[tier.id] ?? 0) - 1),
                              }))
                            }
                            disabled={qty <= 0 || !checkoutOpen}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <div className="min-w-8 text-center font-mono text-sm">{qty}</div>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              updateSelections((current) => ({
                                ...current,
                                [tier.id]: Math.min(maxQty, (current[tier.id] ?? 0) + 1),
                              }))
                            }
                            disabled={qty >= maxQty || tierSoldOut || !checkoutOpen}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <p className="mt-1 text-center text-xs text-muted-foreground">
                          {tierSoldOut ? "Sold out" : `${tier.seats} left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Venue</CardTitle>
              <CardDescription>Check the map and plan your route.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="overflow-hidden rounded-lg">
                <iframe
                  width="100%"
                  height="300"
                  src={buildMapEmbedUrl(event.location)}
                  loading="lazy"
                />
              </div>
              <div className="flex justify-end">
                <Button asChild variant="outline">
                  <a href={mapsHref} target="_blank" rel="noreferrer">
                    Open in Maps
                    <ExternalLink className="size-4" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid content-start gap-3">
          <Card className="sticky top-20 select-none">
            <CardHeader>
              <CardTitle>{countdownTitle}</CardTitle>
              <CardDescription>{countdownDescription}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {hasEnded ? (
                <p className="text-sm text-muted-foreground">
                  This experience is no longer accepting bookings.
                </p>
              ) : hasStarted ? (
                <p className="text-sm text-muted-foreground">
                  The event has started. Any remaining tickets can still be purchased while sales
                  are open.
                </p>
              ) : (
                <div className="flex items-center text-3xl font-black">
                  <NumberFlow value={remainingHours} format={{ minimumIntegerDigits: 2 }} />
                  :
                  <NumberFlow value={remainingMinutes} format={{ minimumIntegerDigits: 2 }} />
                  :
                  <NumberFlow value={remainingSeconds} format={{ minimumIntegerDigits: 2 }} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>{checkoutOpen ? "Checkout" : "Ticket sales"}</CardTitle>
              <CardDescription>
                {selectedTiers.length > 0 && checkoutOpen ? (
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="size-4" />
                    {selectedTiers.length} type(s) selected
                  </span>
                ) : (
                  checkoutStateMessage(event, hasEnded, soldOut)
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {selectedTiers.length > 0 ? (
                <div className="grid gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Your selection</p>
                  {selectedTiers.map((tier) => (
                    <div key={tier.id} className="flex items-center justify-between text-sm">
                      <span>
                        {tier.qty}x {tier.name}
                      </span>
                      <span>{formatMoney(tier.price * tier.qty)}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-2 rounded-lg border border-dashed p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Fees (2% up to {formatMoney(MAX_SERVICE_FEE_MINOR / 100)})
                  </span>
                  <span className="font-medium">{formatMoney(fee)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-semibold">{formatMoney(total)}</span>
                </div>
              </div>

              {!session?.user && checkoutOpen ? (
                <p className="text-xs text-muted-foreground">
                  You will be asked to sign in before Stripe checkout starts.
                </p>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  updateSelections(() => ({}));
                }}
                disabled={selectedTiers.length === 0 || checkoutMutation.isPending}
              >
                Reset
              </Button>
              <Button
                className="w-full sm:w-auto"
                onClick={onCheckout}
                disabled={selectedTiers.length === 0 || checkoutMutation.isPending || !checkoutOpen}
              >
                {checkoutLabel}
              </Button>
            </CardFooter>
          </Card>

          <div className="px-1">
            <p className="text-xs text-muted-foreground">
              By purchasing a ticket, you agree to follow the event safety guidelines and policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
