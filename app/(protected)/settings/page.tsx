"use client";

import * as React from "react";
import { CalendarDays, CircleCheck, LogOut, UserRound } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  events: ["events"] as const,
};

type EventStatus = "DRAFT" | "LIVE" | "STOPPED";

type ProfileData = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
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
};

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
  const startDate = parseIsoDate(value.startDate);
  const endDate = parseIsoDate(value.endDate);

  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof slug !== "string" ||
    typeof location !== "string" ||
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
  };
}

function extractEventItems(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
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

function toIsoOrOriginal(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
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

function draftToEvent(
  draft: EventDraft,
  fallback: SettingsEvent,
): SettingsEvent {
  return {
    ...fallback,
    title: draft.title,
    startDate: toIsoOrOriginal(draft.startDate),
    endDate: toIsoOrOriginal(draft.endDate),
    location: draft.location,
    city: draft.city,
    status: draft.status,
  };
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

      return data as ProfileData;
    },
  });

  const eventsQuery = useQuery({
    queryKey: QUERY_KEYS.events,
    queryFn: async () => {
      const { data, error } = await api.events.get();

      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to load events"));
      }

      const items = extractEventItems(data);
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

      return data as ProfileData;
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

      return normalizeEvent(data);
    },
    onSuccess: (updated, draft) => {
      queryClient.setQueryData<SettingsEvent[]>(
        QUERY_KEYS.events,
        (current) => {
          if (!current) return current;

          return current.map((event) => {
            if (event.id !== draft.id) return event;
            return updated ?? draftToEvent(draft, event);
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

      const { error } = await endpoint.delete();
      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to delete event"));
      }

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
    await onSave(displayName);
    setSaved(true);
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
  const [localError, setLocalError] = React.useState<string | null>(null);

  function resetDraft() {
    setDraft(null);
    setLocalError(null);
  }

  async function saveDraft() {
    if (!draft) return;

    if (!draft.title.trim()) {
      setLocalError("Title is required");
      return;
    }

    if (!draft.startDate || !draft.endDate) {
      setLocalError("Start and end date are required");
      return;
    }

    setLocalError(null);
    await onUpdate(draft);
    resetDraft();
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

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLocalError(null);
                    setDraft(isEditing ? null : eventToDraft(event));
                  }}>
                  {isEditing ? "Cancel" : "Edit"}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={deletingId === event.id}
                  onClick={async () => {
                    await onDelete(event.id);
                    if (isEditing) resetDraft();
                  }}>
                  {deletingId === event.id ? "Deleting..." : "Delete"}
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

                {localError ? (
                  <p className="text-xs text-destructive">{localError}</p>
                ) : null}

                <div className="flex justify-end">
                  <Button type="button" disabled={updating} onClick={saveDraft}>
                    {updating ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
