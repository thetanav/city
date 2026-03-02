"use client";

import * as React from "react";
import QRCode from "qrcode";
import type { Treaty } from "@elysiajs/eden";
import {
  CircleCheck,
  CalendarDays,
  Image as ImageIcon,
  LogOut,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/eden";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";

type EdenEventItem = NonNullable<Treaty.Data<typeof api.events.get>>[number];
type EventItem = {
  id: EdenEventItem["id"];
  title: EdenEventItem["title"];
  slug: EdenEventItem["slug"];
  startDate: string;
  endDate: string;
  location: EdenEventItem["location"];
  city: string;
  status: NonNullable<EdenEventItem["status"]>;
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

export default function SettingsPage() {
  const { data } = useSession();

  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [displayName, setDisplayName] = React.useState(data?.user?.name ?? "");
  const [email, setEmail] = React.useState(data?.user?.email ?? "");
  const [bio, setBio] = React.useState("");
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
    data?.user.image!,
  );

  // Load profile data
  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data, error } = await api.profiles.get();
        if (error) {
          throw new Error(apiErrorMessage(error.value, "Failed to load profile"));
        }
        if (!data) {
          throw new Error("Failed to load profile");
        }
        setDisplayName(data.name ?? "");
        setEmail(data.email ?? "");
        setBio((data as { bio?: string | null }).bio ?? "");
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    loadProfile();
  }, []);

  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsError, setEventsError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    setEventsLoading(true);
    setEventsError(null);

    const loadEvents = async () => {
      try {
        const { data, error } = await api.events.get();
        if (error) {
          throw new Error(apiErrorMessage(error.value, "Failed to load events"));
        }
        if (!data) {
          throw new Error("Failed to load events");
        }
        if (!active) return;
        const items = Array.isArray(data) ? (data as EdenEventItem[]) : [];
        setEvents(items.map(normalizeEdenEvent));
      } catch (err: unknown) {
        if (!active) return;
        const message =
          err instanceof Error ? err.message : "Failed to load events";
        setEventsError(message);
      } finally {
        if (!active) return;
        setEventsLoading(false);
      }
    };

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  function normalizeEdenEvent(item: EdenEventItem): EventItem {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      startDate: item.startDate.toISOString(),
      endDate: item.endDate.toISOString(),
      location: item.location,
      city: item.city ?? "",
      status: item.status ?? "DRAFT",
    };
  }

  async function updateEvent(id: string, patch: Partial<EventItem>) {
    const endpoint = api.events({ id });
    if (!("put" in endpoint)) {
      throw new Error("Failed to update event");
    }

    const { data, error } = await endpoint.put({
      title: patch.title,
      startDate: patch.startDate,
      endDate: patch.endDate,
      location: patch.location,
      city: patch.city,
      status: patch.status,
    });

    if (error) {
      throw new Error(apiErrorMessage(error.value, "Failed to update event"));
    }

    if (!data) {
      throw new Error("Failed to update event");
    }

    const updated = data as EdenEventItem;
    setEvents((prev) =>
      prev.map((e) => (e.id === updated.id ? normalizeEdenEvent(updated) : e)),
    );
  }

  async function deleteEvent(id: string) {
    const endpoint = api.events({ id });
    if (!("delete" in endpoint)) {
      throw new Error("Failed to delete event");
    }

    const { error } = await endpoint.delete();
    if (error) {
      throw new Error(apiErrorMessage(error.value, "Failed to delete event"));
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    try {
      const { error } = await api.profiles.put({
        name: displayName,
        bio: bio || null,
      });

      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to save profile"));
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      console.error("Save failed:", err);
      // Could show an error message here
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full">
      <Tabs defaultValue="profile" className="w-full">
        <div className="flex flex-col gap-2">
          <TabsList className="flex w-full">
            <TabsTrigger value="profile">
              <UserRound className="size-4 opacity-60" /> Profile
            </TabsTrigger>
            <TabsTrigger value="events">
              <CalendarDays className="size-4 opacity-60" /> Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0 outline-none">
            <Card className="border-none px-0 bg-transparent">
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Public-facing basics for your account.
                </CardDescription>
              </CardHeader>
              <form onSubmit={onSaveProfile}>
                <CardContent className="grid gap-4">
                  <div>
                    <img
                      src={avatarUrl!}
                      alt={displayName}
                      className="h-16 w-16 object-cover rounded-xl border"
                    />
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
                  <div className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground">
                      Signed in as
                    </p>
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
                        }}>
                        <LogOut className="size-4" />
                        Sign out
                      </Button>
                    </div>
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
      </Tabs>
    </div>
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
  const [status, setStatus] = React.useState<EventItem["status"]>("DRAFT");
  const [saving, setSaving] = React.useState(false);
  const [deleteBusy, setDeleteBusy] = React.useState<string | null>(null);

  function beginEdit(item: EventItem) {
    setEditingId(item.id);
    setTitle(item.title);
    setStartDate(toLocalInputValue(item.startDate));
    setEndDate(toLocalInputValue(item.endDate));
    setLocation(item.location);
    setCity(item.city);
    setStatus(item.status);
  }

  function resetEdit() {
    setEditingId(null);
    setTitle("");
    setStartDate("");
    setEndDate("");
    setLocation("");
    setCity("");
    setStatus("DRAFT");
  }

  return (
    <Card className="border-none px-0 bg-transparent">
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

                  <div className="mt-2 text-xs text-muted-foreground">
                    {formatWhen(event.startDate)} to {formatWhen(event.endDate)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {event.location}
                    {event.city ? `, ${event.city}` : ""}
                  </div>
                  <div className="mt-1">
                    <Badge
                      variant={
                        event.status === "LIVE"
                          ? "success"
                          : event.status === "STOPPED"
                            ? "warning"
                            : "outline"
                      }
                      size="sm">
                      {event.status}
                    </Badge>
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
                      <div className="grid gap-2">
                        <Label>Status</Label>
                        <div className="relative">
                          <select
                            className={cn(
                              "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            )}
                            value={status}
                            onChange={(e) =>
                              setStatus(e.target.value as EventItem["status"])
                            }>
                            <option value="DRAFT">Draft</option>
                            <option value="LIVE">Live</option>
                            <option value="STOPPED">Stopped</option>
                          </select>
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
                                status,
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
