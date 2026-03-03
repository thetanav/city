"use client";

import { useEffect, useState, use, useMemo } from "react";
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
import { notFound } from "next/navigation";
import Loading from "@/components/loading";
import { toastManager } from "@/components/ui/toast";

type EventData = {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  startDate: string;
  endDate: string | null;
  location: string;
  contactEmail: string | null;
  posterImage: string | null;
  totalTickets: number;
  prices: unknown;
};

type Tier = {
  id: string;
  name: string;
  price: number;
  seats: number;
  note?: string;
};

type SelectedTier = Tier & { qty: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

function normalizeTiers(prices: any, totalTickets: number) {
  if (!Array.isArray(prices)) return [] as Tier[];

  return prices.map((item, index) => {
    if (!isRecord(item)) {
      return {
        id: `tier-${index + 1}`,
        name: `Tier ${index + 1}`,
        price: 0,
        seats: totalTickets,
      } satisfies Tier;
    }

    const name =
      typeof item.name === "string" && item.name.trim().length > 0
        ? item.name
        : `Tier ${index + 1}`;

    const price =
      typeof item.price === "number" && Number.isFinite(item.price)
        ? item.price
        : 0;

    const seats =
      typeof item.seats === "number" && Number.isFinite(item.seats)
        ? Math.max(0, item.seats)
        : totalTickets;

    return {
      id:
        typeof item.id === "string" && item.id.trim().length > 0
          ? item.id
          : `tier-${index + 1}`,
      name,
      price,
      seats,
      note: typeof item.note === "string" ? item.note : undefined,
    } satisfies Tier;
  });
}

function extractCheckoutUrl(payload: unknown) {
  if (isRecord(payload) && typeof payload.url === "string") {
    return payload.url;
  }
  return null;
}

function extractConfirmStatus(payload: unknown) {
  if (!isRecord(payload)) return null;
  return payload.status === "processed" || payload.status === "pending"
    ? payload.status
    : null;
}

function apiErrorMessage(value: unknown, fallback: string): string {
  if (isRecord(value) && typeof value.message === "string")
    return value.message;
  return fallback;
}

export default function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const {
    data: event,
    isLoading,
    isSuccess,
  } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      return (await api.events.slug({ slug }).get()).data?.data;
    },
  });

  const tiers = useMemo<Tier[]>(() => {
    if (!event) return [];
    return normalizeTiers(event.prices, event.totalTickets);
  }, [event]);

  const [selections, setSelections] = useState<Record<string, number>>({});
  const [paymentNotice, setPaymentNotice] = useState<
    | { status: "success"; message: string }
    | { status: "error"; message: string }
    | null
  >(null);

  useEffect(() => {
    setSelections({});
    setPaymentNotice(null);
  }, [event?.slug]);

  const selectedTiers = useMemo<SelectedTier[]>(() => {
    return tiers
      .filter((tier) => (selections[tier.id] ?? 0) > 0)
      .map((tier) => ({ ...tier, qty: selections[tier.id] }));
  }, [tiers, selections]);

  const confirmPaymentMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await api.payments.confirm.post({ sessionId });

      if (error) {
        throw new Error("We could not confirm your payment.");
      }

      const status = extractConfirmStatus(data);
      if (!status) {
        throw new Error("We could not confirm your payment.");
      }

      return status;
    },
  });

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

  useEffect(() => {
    if (!isSuccess) return;

    const search = new URLSearchParams(window.location.search);
    const payment = search.get("payment");
    const sessionId = search.get("session_id");

    if (payment !== "success" || !sessionId) return;

    let active = true;

    const confirmPayment = async () => {
      try {
        const status = await confirmPaymentMutation.mutateAsync(sessionId);
        if (!active) return;

        if (status === "processed") {
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
  }, [confirmPaymentMutation, isSuccess]);

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
      toastManager.add({
        data: "Failed to start checkout. Please try again.",
      });
    }
  }

  if (isLoading) return <Loading />;
  if (!event) return notFound();

  const start = new Date(event.startDate);
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
        }).format(new Date(event.endDate));

  return (
    <div>
      {event.posterImage && (
        <div className="mb-6 overflow-hidden rounded-lg">
          <img
            src={event.posterImage}
            alt="Event cover"
            className="w-full object-cover aspect-16/7"
          />
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {event.title}
        </h1>
        <p className="mt-1 text-muted-foreground">{event.tagline}</p>
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
                      <p className="inline-flex text-sm font-medium">
                        <CornerDownRight className="mr-1 size-4 opacity-60" />
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
                {event.contactEmail && (
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
                )}
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

              <div className="prose prose-md mt-3 max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {event.description}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

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
                        <p className="mt-1 text-center text-xs text-muted-foreground">
                          {soldOut ? "Sold out" : `${t.seats} left`}
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
              <CardDescription>
                Check the map and plan your route.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg">
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
