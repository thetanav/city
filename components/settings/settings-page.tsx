"use client";

import * as React from "react";
import QRCode from "qrcode";
import {
  CircleCheck,
  Copy,
  CalendarDays,
  Download,
  Image as ImageIcon,
  LogOut,
  QrCode,
  Shield,
  Ticket,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";

type TicketItem = {
  id: string;
  eventTitle: string;
  eventSlug: string;
  tierName: string;
  qty: number;
  startsAt: string;
};

type TicketApiItem = {
  id: string;
  tierName: string;
  qty: number;
  event?: {
    title: string;
    slug: string;
    startDate: string;
  } | null;
};

type EventItem = {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  location: string;
  city: string;
};

type EventApiItem = {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  location: string;
  city?: string | null;
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

async function makeQrDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 6,
    color: {
      dark: "#0c1016",
      light: "#ffffff",
    },
  });
}

export default function SettingsPage() {
  const { data } = useSession();

  const [tab, setTab] = React.useState<
    "profile" | "tickets" | "security" | "events"
  >("profile");
  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [displayName, setDisplayName] = React.useState(data?.user?.name ?? "");
  const [email, setEmail] = React.useState(data?.user?.email ?? "");
  const [handle, setHandle] = React.useState(
    (data?.user?.email ?? "user").split("@")[0] ?? "user"
  );
  const [bio, setBio] = React.useState("");
  const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!avatarFile) {
      setAvatarUrl(null);
      return;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  const [tickets, setTickets] = React.useState<TicketItem[]>([]);
  const [ticketsLoading, setTicketsLoading] = React.useState(true);
  const [ticketsError, setTicketsError] = React.useState<string | null>(null);
  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsError, setEventsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setTicketsLoading(true);
    setTicketsError(null);

    fetch("/api/tickets")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const message =
            body && typeof body.message === "string"
              ? body.message
              : "Failed to load tickets";
          throw new Error(message);
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data) ? (data as TicketApiItem[]) : [];
        setTickets(items.map(normalizeTicket));
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Failed to load tickets";
        setTicketsError(message);
      })
      .finally(() => {
        if (!active) return;
        setTicketsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    let active = true;
    setEventsLoading(true);
    setEventsError(null);

    fetch("/api/events")
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          const message =
            body && typeof body.message === "string"
              ? body.message
              : "Failed to load events";
          throw new Error(message);
        }
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        const items = Array.isArray(data) ? (data as EventApiItem[]) : [];
        setEvents(items.map(normalizeEvent));
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Failed to load events";
        setEventsError(message);
      })
      .finally(() => {
        if (!active) return;
        setEventsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function normalizeTicket(item: TicketApiItem): TicketItem {
    return {
      id: item.id,
      eventTitle: item.event?.title ?? "Event",
      eventSlug: item.event?.slug ?? "",
      tierName: item.tierName,
      qty: item.qty,
      startsAt: item.event?.startDate ?? new Date().toISOString(),
    };
  }

  function normalizeEvent(item: EventApiItem): EventItem {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      startDate: item.startDate,
      endDate: item.endDate,
      location: item.location,
      city: item.city ?? "",
    };
  }

  async function updateTicket(id: string, patch: Partial<TicketItem>) {
    const res = await fetch(`/api/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tierName: patch.tierName,
        qty: patch.qty,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        body && typeof body.message === "string"
          ? body.message
          : "Failed to update ticket";
      throw new Error(message);
    }

    const updated = (await res.json()) as TicketApiItem;
    setTickets((prev) =>
      prev.map((t) => (t.id === updated.id ? normalizeTicket(updated) : t))
    );
  }

  async function deleteTicket(id: string) {
    const res = await fetch(`/api/tickets/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        body && typeof body.message === "string"
          ? body.message
          : "Failed to delete ticket";
      throw new Error(message);
    }
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }

  async function updateEvent(id: string, patch: Partial<EventItem>) {
    const res = await fetch(`/api/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: patch.title,
        startDate: patch.startDate,
        endDate: patch.endDate,
        location: patch.location,
        city: patch.city,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        body && typeof body.message === "string"
          ? body.message
          : "Failed to update event";
      throw new Error(message);
    }

    const updated = (await res.json()) as EventApiItem;
    setEvents((prev) =>
      prev.map((e) => (e.id === updated.id ? normalizeEvent(updated) : e))
    );
  }

  async function deleteEvent(id: string) {
    const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message =
        body && typeof body.message === "string"
          ? body.message
          : "Failed to delete event";
      throw new Error(message);
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      await new Promise((r) => setTimeout(r, 500));
      // Wire to DB update later.
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="relative overflow-hidden rounded-3xl border bg-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            background:
              "radial-gradient(980px 540px at 12% 12%, oklch(0.93 0.06 30 / .9), transparent 60%), radial-gradient(900px 540px at 92% 18%, oklch(0.92 0.05 215 / .85), transparent 58%), radial-gradient(900px 620px at 55% 120%, oklch(0.95 0.04 95 / .9), transparent 55%)",
          }}
        />

        <div className="relative p-6 sm:p-10">
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              <span className="rounded-full border bg-background/70 px-3 py-1 font-mono">
                Settings
              </span>
            </p>
            <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
              Account
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Customize your profile and access tickets with entry QR.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[.85fr_1.25fr]">
            <Card className="bg-background/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Navigation</CardTitle>
                <CardDescription>Everything in one place.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setTab("profile")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border bg-background/70 px-4 py-3 text-left",
                    tab === "profile" && "border-foreground/30 ring-1 ring-foreground/15"
                  )}>
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <UserRound className="size-4 text-muted-foreground" /> Profile
                  </span>
                  <span className="text-xs text-muted-foreground">Name, avatar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("tickets")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border bg-background/70 px-4 py-3 text-left",
                    tab === "tickets" && "border-foreground/30 ring-1 ring-foreground/15"
                  )}>
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Ticket className="size-4 text-muted-foreground" /> Tickets
                  </span>
                  <span className="text-xs text-muted-foreground">QR + details</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("security")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border bg-background/70 px-4 py-3 text-left",
                    tab === "security" && "border-foreground/30 ring-1 ring-foreground/15"
                  )}>
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Shield className="size-4 text-muted-foreground" /> Security
                  </span>
                  <span className="text-xs text-muted-foreground">Sessions</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTab("events")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border bg-background/70 px-4 py-3 text-left",
                    tab === "events" && "border-foreground/30 ring-1 ring-foreground/15"
                  )}>
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="size-4 text-muted-foreground" /> Events
                  </span>
                  <span className="text-xs text-muted-foreground">Manage</span>
                </button>

                <div className="mt-3 rounded-xl border bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="mt-1 text-sm font-medium">
                    {data?.user?.name ?? "Guest"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data?.user?.email ?? "Not signed in"}
                  </p>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        await signOut();
                      }}>
                      <LogOut className="size-4" />
                      Sign out
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {tab === "profile" ? (
              <Card className="bg-background/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>Public-facing basics for your account.</CardDescription>
                </CardHeader>
                <form onSubmit={onSaveProfile}>
                  <CardContent className="grid gap-5">
                    <div className="grid gap-2">
                      <Label>Avatar</Label>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative grid size-16 place-items-center overflow-hidden rounded-2xl border bg-background/70">
                          {avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={avatarUrl}
                              alt="Avatar preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setAvatarFile(e.target.files?.[0] ?? null)
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            This is local preview only until you wire upload.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="displayName">Display name</Label>
                        <Input
                          id="displayName"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Your name"
                          autoComplete="off"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="handle">Handle</Label>
                        <Input
                          id="handle"
                          value={handle}
                          onChange={(e) =>
                            setHandle(
                              e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9_]/g, "")
                                .slice(0, 24)
                            )
                          }
                          placeholder="your_handle"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="off"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="bio">Bio</Label>
                      <textarea
                        id="bio"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="What do you host? What do you love?"
                        className={cn(
                          "min-h-28 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                          "placeholder:text-muted-foreground",
                          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                        )}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="text-xs text-muted-foreground">
                      {saved ? (
                        <span className="inline-flex items-center gap-2">
                          <CircleCheck className="size-4" /> Saved
                        </span>
                      ) : (
                        ""
                      )}
                    </div>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={busy}>
                      {busy ? "Saving..." : "Save changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            ) : null}

            {tab === "tickets" ? (
              <TicketsPanel
                tickets={tickets}
                loading={ticketsLoading}
                error={ticketsError}
                onUpdate={updateTicket}
                onDelete={deleteTicket}
              />
            ) : null}

            {tab === "security" ? (
              <Card className="bg-background/80 backdrop-blur">
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>Session and sign-in hygiene.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="rounded-2xl border bg-background/70 p-4">
                    <p className="text-sm font-medium">Active session</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Managed by Better Auth cookie plugin.
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-background/70 p-4">
                    <p className="text-sm font-medium">Recommendations</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add passwordless-only policy, or enable passkeys when you a0want.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {tab === "events" ? (
              <EventsPanel
                events={events}
                loading={eventsLoading}
                error={eventsError}
                onUpdate={updateEvent}
                onDelete={deleteEvent}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketsPanel({
  tickets,
  loading,
  error,
  onUpdate,
  onDelete,
}: {
  tickets: TicketItem[];
  loading: boolean;
  error: string | null;
  onUpdate: (id: string, patch: Partial<TicketItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [activeId, setActiveId] = React.useState(tickets[0]?.id ?? "");
  const active = tickets.find((t) => t.id === activeId) ?? tickets[0];
  const [qr, setQr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [qtyInput, setQtyInput] = React.useState("1");
  const [saving, setSaving] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState(false);

  React.useEffect(() => {
    if (tickets.length && !tickets.find((t) => t.id === activeId)) {
      setActiveId(tickets[0]?.id ?? "");
    }
  }, [tickets, activeId]);

  React.useEffect(() => {
    setQtyInput(active ? String(active.qty) : "1");
  }, [active?.id, active?.qty, active]);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!active) return;
      setBusy(true);
      try {
        const value = JSON.stringify({
          t: active.id,
          e: active.eventSlug,
          qty: active.qty,
        });
        const url = await makeQrDataUrl(value);
        if (!cancelled) setQr(url);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [active?.id, active?.eventSlug, active?.qty, active]);

  return (
    <Card className="bg-background/80 backdrop-blur">
      <CardHeader>
        <CardTitle>Tickets</CardTitle>
        <CardDescription>Show this QR at entry.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {loading ? (
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            Loading tickets...
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            {error}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            No tickets yet.
          </div>
        ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label className="text-xs text-muted-foreground">Your tickets</Label>
            <div className="grid gap-2">
              {tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "w-full rounded-2xl border bg-background/70 p-4 text-left shadow-sm",
                    activeId === t.id &&
                      "border-foreground/30 ring-1 ring-foreground/15"
                  )}>
                  <p className="text-sm font-semibold">{t.eventTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.tierName}  b7 qty {t.qty}  b7 {formatWhen(t.startsAt)}
                  </p>
                </button>
              ))}
            </div>
          </div>

            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Entry QR</Label>
              <div className="rounded-2xl border bg-background/70 p-4">
                <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{active?.eventTitle ?? ""}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {active ? `${active.tierName}  b7 qty ${active.qty}` : ""}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground font-mono break-all">
                    {active?.id}
                  </p>
                </div>
                <div className="grid size-9 place-items-center rounded-xl border bg-background">
                  <QrCode className="size-4 text-muted-foreground" />
                </div>
                </div>

                <div className="mt-4 grid place-items-center">
                {busy || !qr ? (
                  <div className="grid aspect-square w-full max-w-[240px] place-items-center rounded-2xl border bg-background">
                    <p className="text-xs text-muted-foreground">Generating QR...</p>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qr}
                    alt="Ticket QR"
                    className="aspect-square w-full max-w-[240px] rounded-2xl border bg-white p-2"
                  />
                )}
                </div>

              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-end gap-2">
                  <div className="grid gap-1">
                    <Label className="text-[11px] text-muted-foreground">Quantity</Label>
                    <Input
                      value={qtyInput}
                      onChange={(e) =>
                        setQtyInput(e.target.value.replace(/[^0-9]/g, ""))
                      }
                      className="h-9"
                      inputMode="numeric"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9"
                    disabled={!active || saving}
                    onClick={async () => {
                      if (!active) return;
                      const nextQty = Number(qtyInput || active.qty);
                      setSaving(true);
                      try {
                        await onUpdate(active.id, { qty: nextQty });
                      } finally {
                        setSaving(false);
                      }
                    }}>
                    {saving ? "Saving..." : "Update qty"}
                  </Button>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    if (!active) return;
                    await navigator.clipboard.writeText(active.id);
                  }}>
                  <Copy className="size-4" />
                  Copy ticket id
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    if (!qr) return;
                    const a = document.createElement("a");
                    a.href = qr;
                    a.download = `${active?.eventSlug ?? "ticket"}-${active?.id ?? "qr"}.png`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}>
                  <Download className="size-4" />
                  Download QR
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={!active || deleteBusy}
                  onClick={async () => {
                    if (!active) return;
                    setDeleteBusy(true);
                    try {
                      await onDelete(active.id);
                    } finally {
                      setDeleteBusy(false);
                    }
                  }}>
                  {deleteBusy ? "Deleting..." : "Delete ticket"}
                </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventsPanel({
  events,
  loading,
  error,
  onUpdate,
  onDelete,
}: {
  events: EventItem[];
  loading: boolean;
  error: string | null;
  onUpdate: (id: string, patch: Partial<EventItem>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [city, setCity] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState<string | null>(null);

  function beginEdit(item: EventItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setStartDate(toLocalInputValue(item.startDate));
    setEndDate(toLocalInputValue(item.endDate));
    setLocation(item.location);
    setCity(item.city);
  }

  function resetEdit() {
    setEditingId(null);
    setTitle("");
    setStartDate("");
    setEndDate("");
    setLocation("");
    setCity("");
  }

  return (
    <Card className="bg-background/80 backdrop-blur">
      <CardHeader>
        <CardTitle>Events</CardTitle>
        <CardDescription>Update event basics or delete.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {loading ? (
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            Loading events...
          </div>
        ) : error ? (
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border bg-background/70 p-4 text-sm text-muted-foreground">
            No events yet. Create one from /events/new.
          </div>
        ) : (
          <div className="grid gap-3">
            {events.map((event) => {
              const isEditing = editingId === event.id;
              return (
                <div
                  key={event.id}
                  className="rounded-2xl border bg-background/70 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">{event.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        /e/{event.slug}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          isEditing ? resetEdit() : beginEdit(event)
                        }>
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={deleteBusy === event.id}
                        onClick={async () => {
                          setDeleteBusy(event.id);
                          try {
                            await onDelete(event.id);
                          } finally {
                            setDeleteBusy(null);
                          }
                        }}>
                        {deleteBusy === event.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    {formatWhen(event.startDate)} to {formatWhen(event.endDate)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.location}
                    {event.city ? `, ${event.city}` : ""}
                  </div>

                  {isEditing ? (
                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>Start</Label>
                          <Input
                            type="datetime-local"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>End</Label>
                          <Input
                            type="datetime-local"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="grid gap-2">
                          <Label>Location</Label>
                          <Input
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label>City</Label>
                          <Input
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          disabled={saving}
                          onClick={async () => {
                            if (!editingId) return;
                            setSaving(true);
                            try {
                              await onUpdate(editingId, {
                                title,
                                startDate,
                                endDate,
                                location,
                                city,
                              });
                              resetEdit();
                            } finally {
                              setSaving(false);
                            }
                          }}>
                          {saving ? "Saving..." : "Save changes"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
