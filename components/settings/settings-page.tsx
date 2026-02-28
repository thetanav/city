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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [displayName, setDisplayName] = React.useState(data?.user?.name ?? "");
  const [email, setEmail] = React.useState(data?.user?.email ?? "");
  const [handle, setHandle] = React.useState(
    (data?.user?.email ?? "user").split("@")[0] ?? "user",
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
        const message =
          err instanceof Error ? err.message : "Failed to load tickets";
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
        const message =
          err instanceof Error ? err.message : "Failed to load events";
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
      prev.map((t) => (t.id === updated.id ? normalizeTicket(updated) : t)),
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
      prev.map((e) => (e.id === updated.id ? normalizeEvent(updated) : e)),
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
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-sm text-muted-foreground">
          Customize your profile and access tickets with entry QR.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          <div className="space-y-4">
            <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-1">
              <TabsTrigger
                value="profile"
                className="w-full justify-start gap-2 px-3"
              >
                <UserRound className="size-4" /> Profile
              </TabsTrigger>
              <TabsTrigger
                value="tickets"
                className="w-full justify-start gap-2 px-3"
              >
                <Ticket className="size-4" /> Tickets
              </TabsTrigger>
              <TabsTrigger
                value="security"
                className="w-full justify-start gap-2 px-3"
              >
                <Shield className="size-4" /> Security
              </TabsTrigger>
              <TabsTrigger
                value="events"
                className="w-full justify-start gap-2 px-3"
              >
                <CalendarDays className="size-4" /> Events
              </TabsTrigger>
            </TabsList>

            <div className="rounded-lg border p-4">
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
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    await signOut();
                  }}
                >
                  <LogOut className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="min-w-0 space-y-6">
            <TabsContent value="profile" className="mt-0 outline-none">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    Public-facing basics for your account.
                  </CardDescription>
                </CardHeader>
                <form onSubmit={onSaveProfile}>
                  <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Avatar</Label>
                      <div className="flex items-center gap-4">
                        <div className="relative grid size-14 place-items-center overflow-hidden rounded-lg border bg-muted">
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
                        <div className="grid gap-1">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setAvatarFile(e.target.files?.[0] ?? null)
                            }
                          />
                          <p className="text-xs text-muted-foreground">
                            Local preview only.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
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
                                .slice(0, 24),
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
                          "min-h-24 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                          "placeholder:text-muted-foreground",
                          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                        )}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="text-xs text-muted-foreground">
                      {saved && (
                        <span className="inline-flex items-center gap-1">
                          <CircleCheck className="size-3.5" /> Saved
                        </span>
                      )}
                    </div>
                    <Button type="submit" disabled={busy}>
                      {busy ? "Saving..." : "Save changes"}
                    </Button>
                  </CardFooter>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="tickets" className="mt-0 outline-none">
              <TicketsPanel
                tickets={tickets}
                loading={ticketsLoading}
                error={ticketsError}
                onUpdate={updateTicket}
                onDelete={deleteTicket}
              />
            </TabsContent>

            <TabsContent value="security" className="mt-0 outline-none">
              <Card>
                <CardHeader>
                  <CardTitle>Security</CardTitle>
                  <CardDescription>
                    Session and sign-in hygiene.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Active session</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Managed by Better Auth cookie plugin.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">Recommendations</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add passwordless-only policy, or enable passkeys when you
                      want.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events" className="mt-0 outline-none">
              <EventsPanel
                events={events}
                loading={eventsLoading}
                error={eventsError}
                onUpdate={updateEvent}
                onDelete={deleteEvent}
              />
            </TabsContent>
          </div>
        </div>
      </Tabs>
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
    <Card>
      <CardHeader>
        <CardTitle>Tickets</CardTitle>
        <CardDescription>Show this QR at entry.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {loading ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Loading tickets...
          </div>
        ) : error ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {error}
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No tickets yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Ticket list */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">
                Your tickets
              </Label>
              <div className="grid gap-2">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left",
                      activeId === t.id &&
                        "border-foreground/30 ring-1 ring-foreground/10",
                    )}
                  >
                    <p className="text-sm font-semibold">{t.eventTitle}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.tierName} &middot; qty {t.qty} &middot;{" "}
                      {formatWhen(t.startsAt)}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* QR and actions */}
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">Entry QR</Label>
              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {active?.eventTitle ?? ""}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {active
                        ? `${active.tierName} \u00B7 qty ${active.qty}`
                        : ""}
                    </p>
                    <p className="mt-2 text-[11px] text-muted-foreground font-mono break-all">
                      {active?.id}
                    </p>
                  </div>
                  <QrCode className="size-4 text-muted-foreground shrink-0" />
                </div>

                <div className="mt-4 grid place-items-center">
                  {busy || !qr ? (
                    <div className="grid aspect-square w-full max-w-[200px] place-items-center rounded-lg border bg-muted">
                      <p className="text-xs text-muted-foreground">
                        Generating QR...
                      </p>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qr}
                      alt="Ticket QR"
                      className="aspect-square w-full max-w-[200px] rounded-lg border bg-white p-2"
                    />
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-end gap-2">
                    <div className="grid gap-1 flex-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Quantity
                      </Label>
                      <Input
                        value={qtyInput}
                        onChange={(e) =>
                          setQtyInput(e.target.value.replace(/[^0-9]/g, ""))
                        }
                        inputMode="numeric"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                      }}
                    >
                      {saving ? "Saving..." : "Update qty"}
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={async () => {
                        if (!active) return;
                        await navigator.clipboard.writeText(active.id);
                      }}
                    >
                      <Copy className="size-4" />
                      Copy ID
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={async () => {
                        if (!qr) return;
                        const a = document.createElement("a");
                        a.href = qr;
                        a.download = `${active?.eventSlug ?? "ticket"}-${active?.id ?? "qr"}.png`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                      }}
                    >
                      <Download className="size-4" />
                      Download QR
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
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
                      }}
                    >
                      {deleteBusy ? "Deleting..." : "Delete"}
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
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
        <CardDescription>Update event basics or delete.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {loading ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            Loading events...
          </div>
        ) : error ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            {error}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm text-muted-foreground">
            No events yet. Create one from /events/new.
          </div>
        ) : (
          <div className="grid gap-3">
            {events.map((event) => {
              const isEditing = editingId === event.id;
              return (
                <div key={event.id} className="rounded-lg border p-4">
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
                        }
                      >
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
                        }}
                      >
                        {deleteBusy === event.id ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatWhen(event.startDate)} to{" "}
                    {formatWhen(event.endDate)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.location}
                    {event.city ? `, ${event.city}` : ""}
                  </div>

                  {isEditing && (
                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2">
                        <Label>Title</Label>
                        <Input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
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
                      <div className="grid gap-4 sm:grid-cols-2">
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
                          }}
                        >
                          {saving ? "Saving..." : "Save changes"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
