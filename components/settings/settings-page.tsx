"use client";

import * as React from "react";
import QRCode from "qrcode";
import {
  CircleCheck,
  CalendarDays,
  Image as ImageIcon,
  LogOut,
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

export default function SettingsPage() {
  const { data } = useSession();

  const [saved, setSaved] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [displayName, setDisplayName] = React.useState(data?.user?.name ?? "");
  const [email, setEmail] = React.useState(data?.user?.email ?? "");
  const [handle, setHandle] = React.useState("");
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

  // Load profile data
  React.useEffect(() => {
    fetch("/api/profiles")
      .then((res) => res.json())
      .then((profile) => {
        setDisplayName(profile.name ?? "");
        setEmail(profile.email ?? "");
        setHandle(profile.handle ?? "");
        setBio(profile.bio ?? "");
      })
      .catch((err) => {
        console.error("Failed to load profile:", err);
      });
  }, []);

  const [events, setEvents] = React.useState<EventItem[]>([]);
  const [eventsLoading, setEventsLoading] = React.useState(true);
  const [eventsError, setEventsError] = React.useState<string | null>(null);

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
      const res = await fetch("/api/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          handle: handle || null,
          bio: bio || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save profile");
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
    <div className="mx-auto w-full max-w-5xl">
      <Tabs defaultValue="profile" className="w-full">
        <div className="flex flex-col gap-2">
          <TabsList className="flex w-full">
            <TabsTrigger value="profile">
              <UserRound className="size-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="events">
              <CalendarDays className="size-4" /> Events
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

