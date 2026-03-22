"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Minus, Plus, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toastManager } from "@/components/ui/toast";
import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/eden";
import {
  calculateServiceFee,
  formatMoney,
  MAX_SERVICE_FEE_MINOR,
  normalizeEventTiers,
} from "@/lib/ticketing";
import { cn } from "@/lib/utils";
import type { NormalizedEventTier } from "@/types/tier";

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
  status: "DRAFT" | "LIVE" | "STOPPED";
};

type SelectedTier = NormalizedEventTier & { qty: number };

function extractCheckoutUrl(payload: unknown) {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "url" in payload &&
    typeof payload.url === "string"
  ) {
    return payload.url;
  }
  return null;
}

interface TicketBookingSheetContentProps {
  event: EventDetails;
  slug: string;
  checkoutOpen: boolean;
  hasEnded: boolean;
  soldOut: boolean;
}

export function TicketBookingSheetContent({
  event,
  slug,
  checkoutOpen,
  hasEnded,
  soldOut,
}: TicketBookingSheetContentProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selections, setSelections] = useState<Record<string, number>>({});

  const tiers = useMemo(() => {
    return normalizeEventTiers(event.prices, event.totalTickets);
  }, [event]);

  const selectedTiers = useMemo<SelectedTier[]>(() => {
    return tiers
      .filter((tier) => (selections[tier.id] ?? 0) > 0)
      .map((tier) => ({ ...tier, qty: selections[tier.id] ?? 0 }));
  }, [tiers, selections]);

  const subtotal = selectedTiers.reduce(
    (sum: number, tier) => sum + tier.price * tier.qty,
    0,
  );
  const fee = calculateServiceFee(subtotal);
  const total = subtotal + fee;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!event || selectedTiers.length === 0) {
        throw new Error("Select at least one ticket.");
      }

      const { data, error } = await api.payments.checkout.post({
        eventId: event.id,
        tiers: selectedTiers.map((tier) => ({
          id: tier.id,
          name: tier.name,
          qty: tier.qty,
        })),
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

  function updateSelections(
    updater: (current: Record<string, number>) => Record<string, number>,
  ) {
    setSelections(updater);
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

  const checkoutStateMessage = hasEnded
    ? "This event has already ended."
    : soldOut
      ? "This event is sold out."
      : event.status !== "LIVE"
        ? "Ticket sales are currently unavailable."
        : "Pick your tickets";

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tickets</CardTitle>
            <CardDescription>Select a tier. Seats are limited.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {tiers.map((tier: NormalizedEventTier) => {
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
                  )}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{tier.name}</p>
                      {tier.note ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {tier.note}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm font-semibold">
                        {formatMoney(tier.price)}
                      </p>
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
                              [tier.id]: Math.max(
                                0,
                                (current[tier.id] ?? 0) - 1,
                              ),
                            }))
                          }
                          disabled={qty <= 0 || !checkoutOpen}>
                          <Minus className="size-3" />
                        </Button>
                        <div className="min-w-8 text-center font-mono text-sm">
                          {qty}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="size-8"
                          onClick={() =>
                            updateSelections((current) => ({
                              ...current,
                              [tier.id]: Math.min(
                                maxQty,
                                (current[tier.id] ?? 0) + 1,
                              ),
                            }))
                          }
                          disabled={
                            qty >= maxQty || tierSoldOut || !checkoutOpen
                          }>
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
            <CardTitle>{checkoutOpen ? "Checkout" : "Ticket sales"}</CardTitle>
            <CardDescription>
              {selectedTiers.length > 0 && checkoutOpen ? (
                <span className="inline-flex items-center gap-2">
                  <Ticket className="size-4" />
                  {selectedTiers.length} type(s) selected
                </span>
              ) : (
                checkoutStateMessage
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {selectedTiers.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Your selection
                </p>
                {selectedTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="flex items-center justify-between text-sm">
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
                <span className="text-sm font-semibold">
                  {formatMoney(total)}
                </span>
              </div>
            </div>

            {!session?.user && checkoutOpen ? (
              <p className="text-xs text-muted-foreground">
                You will be asked to sign in before Stripe checkout starts.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="border-t p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setSelections({})}
            disabled={selectedTiers.length === 0 || checkoutMutation.isPending}>
            Reset
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={onCheckout}
            disabled={
              selectedTiers.length === 0 ||
              checkoutMutation.isPending ||
              !checkoutOpen
            }>
            {checkoutLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
