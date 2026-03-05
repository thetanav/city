"use client";

import * as React from "react";
import { CalendarDays, CircleCheck, LogOut, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { signOut, useSession } from "@/lib/auth-client";
import { api } from "@/lib/eden";
import { cn } from "@/lib/utils";

const QUERY_KEYS = {
  profile: ["profile"] as const,
  events: ["creator-events"] as const,
};

type EventStatus = "DRAFT" | "LIVE" | "STOPPED";

type ProfileData = {
  name: string | null;
  email: string | null;
  image: string | null;
};

type SettingsEvent = {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  endDate: string;
  location: string;
  city: string;
  status: EventStatus;
  totalTickets: number;
  soldTickets: number;
  hasIssuedTickets: boolean;
};

type SettingsEventUpdate = Omit<
  SettingsEvent,
  "soldTickets" | "hasIssuedTickets"
>;

type EventDraft = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  city: string;
  status: EventStatus;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function apiErrorMessage(value: unknown, fallback: string) {
  if (isRecord(value) && typeof value.message === "string") {
    return value.message;
  }

  return fallback;
}

function extractOkData(value: unknown, fallback: string) {
  if (!isRecord(value)) {
    throw new Error(fallback);
  }

  if (value.ok !== true) {
    throw new Error(apiErrorMessage(value, fallback));
  }

  return value.data;
}

function normalizeProfile(value: unknown): ProfileData {
  if (!isRecord(value)) {
    return {
      name: null,
      email: null,
      image: null,
    };
  }

  return {
    name: typeof value.name === "string" ? value.name : null,
    email: typeof value.email === "string" ? value.email : null,
    image: typeof value.image === "string" ? value.image : null,
  };
}

function parseIsoDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function normalizeEvent(value: unknown): SettingsEvent | null {
  if (!isRecord(value)) return null;

  const id = value.id;
  const title = value.title;
  const slug = value.slug;
  const location = value.location;
  const totalTickets = value.totalTickets;
  const soldTickets = value.soldTickets;
  const hasIssuedTickets = value.hasIssuedTickets;
  const startDate = parseIsoDate(value.startDate);
  const endDate = parseIsoDate(value.endDate);

  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof slug !== "string" ||
    typeof location !== "string" ||
    typeof totalTickets !== "number" ||
    typeof soldTickets !== "number" ||
    typeof hasIssuedTickets !== "boolean" ||
    !startDate ||
    !endDate
  ) {
    return null;
  }

  const status = value.status;
  const safeStatus: EventStatus =
    status === "LIVE" || status === "STOPPED" || status === "DRAFT"
      ? status
      : "DRAFT";

  return {
    id,
    title,
    slug,
    startDate,
    endDate,
    location,
    city: typeof value.city === "string" ? value.city : "",
    status: safeStatus,
    totalTickets,
    soldTickets,
    hasIssuedTickets,
  };
}

function normalizeUpdatedEvent(value: unknown): SettingsEventUpdate | null {
  if (!isRecord(value)) return null;

  const id = value.id;
  const title = value.title;
  const slug = value.slug;
  const location = value.location;
  const totalTickets = value.totalTickets;
  const startDate = parseIsoDate(value.startDate);
  const endDate = parseIsoDate(value.endDate);

  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof slug !== "string" ||
    typeof location !== "string" ||
    typeof totalTickets !== "number" ||
    !startDate ||
    !endDate
  ) {
    return null;
  }

  const status = value.status;
  const safeStatus: EventStatus =
    status === "LIVE" || status === "STOPPED" || status === "DRAFT"
      ? status
      : "DRAFT";

  return {
    id,
    title,
    slug,
    startDate,
    endDate,
    location,
    city: typeof value.city === "string" ? value.city : "",
    status: safeStatus,
    totalTickets,
  };
}

function formatWhen(iso: string) {
  const date = new Date(iso);

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function eventToDraft(event: SettingsEvent): EventDraft {
  return {
    id: event.id,
    title: event.title,
    startDate: toLocalInputValue(event.startDate),
    endDate: toLocalInputValue(event.endDate),
    location: event.location,
    city: event.city,
    status: event.status,
  };
}

function statusVariant(status: EventStatus): "success" | "warning" | "outline" {
  if (status === "LIVE") return "success";
  if (status === "STOPPED") return "warning";
  return "outline";
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: async () => {
      const { data, error } = await api.profiles.get();

      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to load profile"));
      }

      if (!data) {
        throw new Error("Failed to load profile");
      }

      return normalizeProfile(extractOkData(data, "Failed to load profile"));
    },
  });

  const eventsQuery = useQuery({
    queryKey: QUERY_KEYS.events,
    queryFn: async () => {
      const { data, error } = await api.events.mine.get();

      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to load events"));
      }

      const items = extractOkData(data, "Failed to load events");
      if (!Array.isArray(items)) {
        throw new Error("Failed to load events");
      }

      return items
        .map(normalizeEvent)
        .filter((event): event is SettingsEvent => {
          return event !== null;
        });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      const { data, error } = await api.profiles.put(payload);

      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to save profile"));
      }

      if (!data) {
        throw new Error("Failed to save profile");
      }

      return normalizeProfile(extractOkData(data, "Failed to save profile"));
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(QUERY_KEYS.profile, updated);
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (draft: EventDraft) => {
      const endpoint = api.events({ id: draft.id });
      if (!("put" in endpoint)) {
        throw new Error("Update route unavailable");
      }

      const { data, error } = await endpoint.put({
        title: draft.title,
        startDate: draft.startDate,
        endDate: draft.endDate,
        location: draft.location,
        city: draft.city,
        status: draft.status,
      });

      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to update event"));
      }

      const updated = normalizeUpdatedEvent(
        extractOkData(data, "Failed to update event"),
      );
      if (!updated) {
        throw new Error("Failed to update event");
      }

      return updated;
    },
    onSuccess: (updated, draft) => {
      queryClient.setQueryData<SettingsEvent[]>(
        QUERY_KEYS.events,
        (current) => {
          if (!current) return current;

          return current.map((event) => {
            if (event.id !== draft.id) return event;
            return {
              ...event,
              ...updated,
            };
          });
        },
      );
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const endpoint = api.events({ id });
      if (!("delete" in endpoint)) {
        throw new Error("Delete route unavailable");
      }

      const { data, error } = await endpoint.delete();
      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to delete event"));
      }

      extractOkData(data, "Failed to delete event");
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<SettingsEvent[]>(
        QUERY_KEYS.events,
        (current) => {
          return current?.filter((event) => event.id !== id) ?? current;
        },
      );
    },
  });

  const eventsError = eventsQuery.isError
    ? eventsQuery.error instanceof Error
      ? eventsQuery.error.message
      : "Failed to load events"
    : null;

  return (
    <div className="w-full">
      <Tabs defaultValue="profile" className="w-full">
        <div className="flex flex-col gap-2">
          <TabsList>
            <TabsTab value="profile">
              <UserRound className="size-4 opacity-60" /> Profile
            </TabsTab>
            <TabsTab value="events">
              <CalendarDays className="size-4 opacity-60" /> Events
            </TabsTab>
          </TabsList>

          <TabsPanel value="profile" className="mt-0 outline-none">
            <ProfilePanel
              sessionName={session?.user?.name ?? "Guest"}
              sessionEmail={session?.user?.email ?? "Not signed in"}
              profile={profileQuery.data}
              loading={profileQuery.isLoading}
              saveError={
                updateProfileMutation.isError
                  ? updateProfileMutation.error instanceof Error
                    ? updateProfileMutation.error.message
                    : "Failed to save profile"
                  : null
              }
              saving={updateProfileMutation.isPending}
              onSave={async (name) => {
                await updateProfileMutation.mutateAsync({ name });
              }}
            />
          </TabsPanel>

          <TabsPanel value="events" className="mt-0 outline-none">
            <EventsPanel
              events={eventsQuery.data ?? []}
              loading={eventsQuery.isLoading}
              error={eventsError}
              updating={updateEventMutation.isPending}
              deletingId={
                deleteEventMutation.isPending
                  ? deleteEventMutation.variables
                  : null
              }
              onUpdate={async (draft) => {
                await updateEventMutation.mutateAsync(draft);
              }}
              onDelete={async (id) => {
                await deleteEventMutation.mutateAsync(id);
              }}
            />
          </TabsPanel>
        </div>
      </Tabs>
    </div>
  );
}

function ProfilePanel({
  sessionName,
  sessionEmail,
  profile,
  loading,
  saving,
  saveError,
  onSave,
}: {
  sessionName: string;
  sessionEmail: string;
  profile?: ProfileData;
  loading: boolean;
  saving: boolean;
  saveError: string | null;
  onSave: (name: string) => Promise<void>;
}) {
  const [displayName, setDisplayName] = React.useState(profile?.name ?? "");
  const [email, setEmail] = React.useState(profile?.email ?? "");
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setDisplayName(profile?.name ?? "");
    setEmail(profile?.email ?? "");
  }, [profile?.name, profile?.email]);

  React.useEffect(() => {
    if (!saved) return;
    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [saved]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onSave(displayName);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  const avatarUrl = profile?.image ?? null;

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {loading ? (
        <div className="rounded-lg border p-4 text-sm text-muted-foreground">
          Loading profile...
        </div>
      ) : null}

      <div>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={displayName || "Profile image"}
            className="h-16 w-16 rounded-xl border object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-xl border bg-muted" />
        )}
      </div>

      <div className="grid gap-2 sm:max-w-md">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Your name"
          autoComplete="off"
        />
      </div>

      <div className="grid gap-2 sm:max-w-md">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled
        />
      </div>

      <div className="rounded-lg border p-4 sm:max-w-md">
        <p className="text-xs text-muted-foreground">Signed in as</p>
        <p className="mt-1 text-sm font-medium">{sessionName}</p>
        <p className="text-xs text-muted-foreground">{sessionEmail}</p>
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

      <div className="text-xs text-muted-foreground">
        {saved ? (
          <span className="inline-flex items-center gap-1">
            <CircleCheck className="size-3.5" />
            Saved
          </span>
        ) : null}
        {saveError ? <p className="text-destructive">{saveError}</p> : null}
      </div>

      <div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function EventsPanel({
  events,
  loading,
  error,
  updating,
  deletingId,
  onUpdate,
  onDelete,
}: {
  events: SettingsEvent[];
  loading: boolean;
  error: string | null;
  updating: boolean;
  deletingId: string | null;
  onUpdate: (draft: EventDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [draft, setDraft] = React.useState<EventDraft | null>(null);
  const [actionError, setActionError] = React.useState<{
    id: string;
    message: string;
  } | null>(null);

  function resetDraft() {
    setDraft(null);
    setActionError(null);
  }

  async function saveDraft() {
    if (!draft) return;

    if (!draft.title.trim()) {
      setActionError({ id: draft.id, message: "Title is required" });
      return;
    }

    if (!draft.startDate || !draft.endDate) {
      setActionError({
        id: draft.id,
        message: "Start and end date are required",
      });
      return;
    }

    setActionError(null);

    try {
      await onUpdate(draft);
      resetDraft();
    } catch (error) {
      setActionError({
        id: draft.id,
        message:
          error instanceof Error ? error.message : "Failed to update event",
      });
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        Loading events...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        No events yet. Create one from /events/new.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {events.map((event) => {
        const isEditing = draft?.id === event.id;
        const currentDraft = isEditing ? draft : null;

        return (
          <div key={event.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  /e/{event.slug}
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  render={<Link href={`/e/${event.slug}`} />}
                  variant="outline"
                  size="sm">
                  View page
                </Button>
                <Button
                  render={<Link href={`/dashboard/${event.slug}`} />}
                  variant="outline"
                  size="sm">
                  Sales
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionError(null);
                    setDraft(isEditing ? null : eventToDraft(event));
                  }}>
                  {isEditing ? "Cancel" : "Edit"}
                </Button>

                <Button
                  type="button"
                  variant="destructive-outline"
                  size="sm"
                  disabled={deletingId === event.id || event.hasIssuedTickets}
                  onClick={async () => {
                    setActionError(null);

                    try {
                      await onDelete(event.id);
                      if (isEditing) resetDraft();
                    } catch (error) {
                      setActionError({
                        id: event.id,
                        message:
                          error instanceof Error
                            ? error.message
                            : "Failed to delete event",
                      });
                    }
                  }}>
                  {deletingId === event.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                {formatWhen(event.startDate)} to {formatWhen(event.endDate)}
              </span>
              <span>
                {event.location}
                {event.city ? `, ${event.city}` : ""}
              </span>
              <span>
                {event.soldTickets}/{event.totalTickets} sold
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(event.status)} size="sm">
                {event.status}
              </Badge>
              {event.hasIssuedTickets ? (
                <span className="text-xs text-muted-foreground">
                  Delete is locked after tickets are issued.
                </span>
              ) : null}
            </div>

            {currentDraft ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor={`title-${event.id}`}>Title</Label>
                  <Input
                    id={`title-${event.id}`}
                    value={currentDraft.title}
                    onChange={(editEvent) => {
                      setDraft({
                        ...currentDraft,
                        title: editEvent.target.value,
                      });
                    }}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`start-${event.id}`}>Start</Label>
                    <Input
                      id={`start-${event.id}`}
                      type="datetime-local"
                      value={currentDraft.startDate}
                      onChange={(editEvent) => {
                        setDraft({
                          ...currentDraft,
                          startDate: editEvent.target.value,
                        });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`end-${event.id}`}>End</Label>
                    <Input
                      id={`end-${event.id}`}
                      type="datetime-local"
                      value={currentDraft.endDate}
                      onChange={(editEvent) => {
                        setDraft({
                          ...currentDraft,
                          endDate: editEvent.target.value,
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`location-${event.id}`}>Location</Label>
                    <Input
                      id={`location-${event.id}`}
                      value={currentDraft.location}
                      onChange={(editEvent) => {
                        setDraft({
                          ...currentDraft,
                          location: editEvent.target.value,
                        });
                      }}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`city-${event.id}`}>City</Label>
                    <Input
                      id={`city-${event.id}`}
                      value={currentDraft.city}
                      onChange={(editEvent) => {
                        setDraft({
                          ...currentDraft,
                          city: editEvent.target.value,
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor={`status-${event.id}`}>Status</Label>
                  <select
                    id={`status-${event.id}`}
                    className={cn(
                      "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    value={currentDraft.status}
                    onChange={(editEvent) => {
                      const nextStatus = editEvent.target.value;
                      if (
                        nextStatus === "DRAFT" ||
                        nextStatus === "LIVE" ||
                        nextStatus === "STOPPED"
                      ) {
                        setDraft({ ...currentDraft, status: nextStatus });
                      }
                    }}>
                    <option value="DRAFT">Draft</option>
                    <option value="LIVE">Live</option>
                    <option value="STOPPED">Stopped</option>
                  </select>
                </div>

                {actionError?.id === event.id ? (
                  <p className="text-xs text-destructive">
                    {actionError.message}
                  </p>
                ) : null}

                <div className="flex justify-end">
                  <Button type="button" disabled={updating} onClick={saveDraft}>
                    {updating ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </div>
            ) : actionError?.id === event.id ? (
              <p className="mt-3 text-xs text-destructive">
                {actionError.message}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
