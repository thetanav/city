"use client";

import * as React from "react";
import type { Treaty } from "@elysiajs/eden";
import {
  CalendarDays,
  CornerDownRight,
  MapPin,
  Minus,
  Plus,
  Ticket,
  Mail,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/eden";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

type Tier = {
  id: string;
  name: string;
  price: number;
  seats: number;
  note?: string;
};

type SelectedTier = Tier & { qty: number };

type PaymentConfirmResponse = NonNullable<
  Exclude<Treaty.Data<typeof api.payments.confirm.post>, { message: string }>
>;

type CheckoutResponse = NonNullable<
  Exclude<Treaty.Data<typeof api.payments.checkout.post>, { message: string }>
>;

type EdenEvent = NonNullable<
  Exclude<
    Treaty.Data<ReturnType<typeof api.events.slug>["get"]>,
    {
      message: string;
    }
  >
>;

type ApiEventWire = Omit<EdenEvent, "startDate" | "endDate"> & {
  startDate: string | Date;
  endDate: string | Date;
};

function apiErrorMessage(value: unknown, fallback: string) {
  if (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof (value as Record<string, unknown>).message === "string"
  ) {
    return (value as { message: string }).message;
  }

  return fallback;
}

function normalizeTiers(prices: unknown, totalTickets: number | undefined) {
  if (!Array.isArray(prices)) return [] as Tier[];

  return prices.map((item, index) => {
    const fallbackRemaining = totalTickets ?? 0;

    if (typeof item !== "object" || item === null) {
      return {
        id: `tier-${index + 1}`,
        name: `Tier ${index + 1}`,
        price: 0,
        seats: fallbackRemaining,
        note: "Invalid tier data",
      };
    }

    const raw = item as Tier;

    return {
      id: `tier-${index + 1}`,
      name: raw.name,
      price: raw.price,
      seats: raw.seats,
      note: raw.note,
    } satisfies Tier;
  });
}

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = await params;

  const eventQuery = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const endpoint = api.events.slug({ slug });
      if (!("get" in endpoint)) {
        throw new Error("Failed to load event");
      }
      const { data, error } = await endpoint.get();
      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to load event"));
      }
      if (!data) {
        throw new Error("Failed to load event");
      }
      return normalizeEvent(data as ApiEventWire);
    },
  });

  const event = eventQuery.data ?? null;
  const loading = eventQuery.isLoading;
  const loadError = eventQuery.isError
    ? eventQuery.error instanceof Error
      ? eventQuery.error.message
      : "Failed to load event"
    : null;

  const tiers = React.useMemo<Tier[]>(() => {
    if (!event) return [];
    return normalizeTiers(event.prices, event.totalTickets);
  }, [event]);

  const [selections, setSelections] = React.useState<Record<string, number>>(
    {},
  );
  const [paymentNotice, setPaymentNotice] = React.useState<
    | { status: "success"; message: string }
    | { status: "error"; message: string }
    | null
  >(null);

  React.useEffect(() => {
    setSelections({});
    setPaymentNotice(null);
  }, [event?.slug]);

  const confirmPaymentMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await api.payments.confirm.post({ sessionId });
      if (error) {
        throw new Error(
          apiErrorMessage(error.value, "We could not confirm your payment."),
        );
      }
      if (!data) {
        throw new Error("We could not confirm your payment.");
      }
      return data as PaymentConfirmResponse;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (selectedTiers.length === 0 || !event) {
        throw new Error("Select at least one ticket.");
      }
      const { data, error } = await api.payments.checkout.post({
        eventId: event.id,
        tiers: selectedTiers.map(({ id, name, qty }) => ({ id, name, qty })),
      });

      if (error) {
        throw new Error(
          apiErrorMessage(error.value, "Failed to start checkout"),
        );
      }

      if (!data) {
        throw new Error("Checkout session not available");
      }

      const payload = data as CheckoutResponse;
      if (!payload.url) {
        throw new Error("Checkout session not available");
      }

      return payload.url;
    },
  });

  React.useEffect(() => {
    if (!eventQuery.isSuccess) return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const sessionId = params.get("session_id");

    if (payment !== "success" || !sessionId) return;

    let active = true;

    const confirmPayment = async () => {
      try {
        const result = await confirmPaymentMutation.mutateAsync(sessionId);
        if (!active) return;
        if (result.status === "processed") {
          setPaymentNotice({
            status: "success",
            message:
              "Payment confirmed. Your tickets are ready and a confirmation email is on the way.",
          });
        } else {
          setPaymentNotice({
            status: "success",
            message:
              "Payment received. We are finalizing your tickets and will email you shortly.",
          });
        }
      } catch (err) {
        if (!active) return;
        const message =
          err instanceof Error
            ? err.message
            : "We could not confirm your payment.";
        setPaymentNotice({ status: "error", message });
      }
    };

    confirmPayment();

    return () => {
      active = false;
    };
  }, [confirmPaymentMutation, eventQuery.isSuccess]);

  const selectedTiers = React.useMemo<SelectedTier[]>(() => {
    return tiers
      .filter((tier) => selections[tier.id] > 0)
      .map((tier) => ({ ...tier, qty: selections[tier.id] }));
  }, [tiers, selections]);

  const subtotal = selectedTiers.reduce(
    (acc, tier) => acc + tier.price * tier.qty,
    0,
  );
  const fee = Math.min(5, Math.max(0, Math.round(subtotal * 0.02 * 100) / 100));
  const total = subtotal + fee;

  async function onCheckout() {
    try {
      const checkoutUrl = await checkoutMutation.mutateAsync();
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error(err);
      alert("Failed to start checkout. Please try again.");
    }
  }

  if (loading) {
    return (
      <div>
        <div className="rounded-lg border p-8 text-sm text-muted-foreground">
          Loading event...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <div className="rounded-lg border p-8 text-sm text-muted-foreground">
          {loadError}
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <div className="rounded-lg border p-8 text-sm text-muted-foreground">
          Event not found.
        </div>
      </div>
    );
  }

  const start = new Date(event.startDate);
  const when = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);

  let end = null;
  let until = null;
  if (event.endDate) {
    end = new Date(event.endDate);
    until = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(end);
  }

  return (
    <div>
      {/* Cover Image */}
      {event.posterImage && (
        <div className="rounded-lg overflow-hidden mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={event.posterImage}
            alt="Event cover"
            className="h-56 w-full object-cover sm:h-72"
          />
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {event.title}
        </h1>
        <p className="text-muted-foreground mt-1">{event.tagline}</p>
      </div>

      {paymentNotice && (
        <div
          className={cn(
            "mb-6 rounded-lg border px-4 py-3 text-sm",
            paymentNotice.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          )}>
          {paymentNotice.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_.85fr]">
        <div className="grid gap-6">
          {/* About */}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
              <CardDescription>
                What you should know before you go.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">When</p>
                    <p className="text-sm font-medium">{when}</p>
                    {until && (
                      <p className="text-sm font-medium inline-flex">
                        <CornerDownRight className="opacity-60 size-4 mr-1" />
                        {until}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Where</p>
                    <p className="text-sm font-medium">{event.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <a
                      className="text-sm font-medium"
                      href={`mailto:${event.contactEmail}`}>
                      {event.contactEmail}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Ticket className="mt-0.5 size-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Available Tickets
                    </p>
                    <p className="text-sm font-medium">{event.totalTickets}</p>
                  </div>
                </div>
              </div>

              <div className="prose prose-md dark:prose-invert max-w-none mt-3">
                <ReactMarkdown>{event.description}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Tickets */}
          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
              <CardDescription>
                Select a tier. Seats are limited.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {tiers.map((t) => {
                const qty = selections[t.id] || 0;
                const soldOut = t.seats <= 0;
                const maxQty = Math.max(0, Math.min(8, t.seats));

                return (
                  <div
                    key={t.id}
                    className={cn(
                      "rounded-lg border p-4",
                      qty > 0 &&
                        "border-foreground/30 ring-1 ring-foreground/10",
                      soldOut && "opacity-60",
                    )}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{t.name}</p>
                        {t.note && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t.note}
                          </p>
                        )}
                        <p className="mt-1 text-sm font-semibold">
                          {formatMoney(t.price)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              setSelections((prev) => ({
                                ...prev,
                                [t.id]: Math.max(0, (prev[t.id] || 0) - 1),
                              }))
                            }
                            disabled={qty <= 0}>
                            <Minus className="size-3" />
                          </Button>
                          <div className="min-w-8 text-center font-mono text-sm">
                            {qty}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              setSelections((prev) => ({
                                ...prev,
                                [t.id]: Math.min(maxQty, (prev[t.id] || 0) + 1),
                              }))
                            }
                            disabled={qty >= maxQty || soldOut}>
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground text-center">
                          {soldOut ? "Sold out" : `${t.seats} left`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Venue */}
          <Card>
            <CardHeader>
              <CardTitle>Venue</CardTitle>
              <CardDescription>
                Check the map and plan your route.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden">
                <iframe
                  width="100%"
                  height="300"
                  src="https://maps.google.com/maps?width=650&height=400&hl=en&q=2880%20Broadway%2C%20New%20York&t=&z=14&ie=UTF8&iwloc=B&output=embed"
                  loading="lazy"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Checkout */}
        <div className="grid content-start gap-6">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Checkout</CardTitle>
              <CardDescription>
                {selectedTiers.length > 0 ? (
                  <span className="inline-flex items-center gap-2">
                    <Ticket className="size-4" />
                    {selectedTiers.length} type(s) selected
                  </span>
                ) : (
                  "Pick your tickets"
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {selectedTiers.length > 0 && (
                <div className="grid gap-2 rounded-lg border p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    Your selection
                  </p>
                  {selectedTiers.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between text-sm">
                      <span>
                        {t.qty}x {t.name}
                      </span>
                      <span>{formatMoney(t.price * t.qty)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-2 rounded-lg border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Fees (2% up to $5)
                  </span>
                  <span className="font-medium">{formatMoney(fee)}</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Total</span>
                  <span className="text-sm font-semibold">
                    {formatMoney(total)}
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setSelections({});
                }}>
                Reset
              </Button>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={onCheckout}
                disabled={
                  selectedTiers.length === 0 || checkoutMutation.isPending
                }>
                {checkoutMutation.isPending ? "Processing..." : "Buy tickets"}
              </Button>
            </CardFooter>
          </Card>

          <div className="px-1">
            <p className="text-xs text-muted-foreground">
              By purchasing a ticket, you agree to follow the event's safety
              guidelines and policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeEvent(data: ApiEventWire): Omit<
  EdenEvent,
  "startDate" | "endDate"
> & {
  startDate: string;
  endDate: string;
} {
  return {
    ...data,
    startDate:
      data.startDate instanceof Date
        ? data.startDate.toISOString()
        : data.startDate,
    endDate:
      data.endDate instanceof Date ? data.endDate.toISOString() : data.endDate,
  };
}
