"use client";

import * as React from "react";
import { CalendarDays, CircleCheck, LogOut, UserRound } from "lucide-react";
import Link from "next/link";

import DynamicImg from "@/components/dynimg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

import {
  EVENT_STATUS_LABELS,
  EVENT_STATUS_OPTIONS,
  type EventDraft,
  type EventStatus,
  type SettingsEvent,
  eventToDraft,
  formatWhen,
  statusVariant,
  useSettingsData,
} from "./settings-data";

function MessageBox({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "destructive";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4 text-sm",
        tone === "destructive"
          ? "border-destructive/25 bg-destructive/5 text-destructive"
          : "text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

function SettingsView() {
  const data = useSettingsData();

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
              email={data.sessionEmail}
              loading={data.profileLoading}
              loadingError={data.profileError}
              profile={data.profile}
              saveError={data.saveProfileError}
              saving={data.profileSaving}
              sessionName={data.sessionName}
              onSave={data.saveProfile}
            />
          </TabsPanel>

          <TabsPanel value="events" className="mt-0 outline-none">
            <EventsPanel
              deletingId={data.deletingId}
              error={data.eventsError}
              events={data.events}
              loading={data.eventsLoading}
              updating={data.updatingEvent}
              onDelete={data.deleteEvent}
              onUpdate={data.updateEvent}
            />
          </TabsPanel>
        </div>
      </Tabs>
    </div>
  );
}

function ProfilePanel({
  email,
  loading,
  loadingError,
  profile,
  saveError,
  saving,
  sessionName,
  onSave,
}: {
  email: string;
  loading: boolean;
  loadingError: string | null;
  profile?: { name: string | null; email: string | null; image: string | null };
  saveError: string | null;
  saving: boolean;
  sessionName: string;
  onSave: (name: string) => Promise<void>;
}) {
  const resolvedName = profile?.name ?? sessionName;
  const [displayName, setDisplayName] = React.useState(resolvedName);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    setDisplayName(resolvedName);
  }, [resolvedName]);

  React.useEffect(() => {
    if (!saved) return;

    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [saved]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await onSave(displayName.trim());
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  const avatarUrl = profile?.image ?? null;
  const contactEmail = profile?.email ?? email;

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {loading ? <MessageBox>Loading profile...</MessageBox> : null}
      {loadingError ? <MessageBox tone="destructive">{loadingError}</MessageBox> : null}

      <div className="grid gap-2 sm:max-w-md">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </div>

      <div className="grid gap-3 rounded-lg border p-4 sm:max-w-md">
        <div className="flex items-center gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted">
            {avatarUrl ? (
              <DynamicImg alt={`${sessionName} avatar`} className="size-full" src={avatarUrl} />
            ) : (
              <UserRound className="size-6 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-medium">{sessionName}</p>
            <p className="truncate text-xs text-muted-foreground">{contactEmail}</p>
          </div>
        </div>

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

  function updateDraft(patch: Partial<EventDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
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
        message: error instanceof Error ? error.message : "Failed to update event",
      });
    }
  }

  if (loading) {
    return <MessageBox>Loading events...</MessageBox>;
  }

  if (error) {
    return <MessageBox tone="destructive">{error}</MessageBox>;
  }

  if (events.length === 0) {
    return <MessageBox>No events yet. Create one from /events/new.</MessageBox>;
  }

  return (
    <div className="grid gap-3">
      {events.map((event) => {
        const isEditing = draft?.id === event.id;

        return (
          <div key={event.id} className="rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold">{event.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">/e/{event.slug}</p>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/e/${event.slug}`}>View page</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/${event.slug}`}>Sales</Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActionError(null);
                    setDraft((current) => (current?.id === event.id ? null : eventToDraft(event)));
                  }}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
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
                        message: error instanceof Error ? error.message : "Failed to delete event",
                      });
                    }
                  }}
                >
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

            {isEditing && draft ? (
              <div className="mt-4 grid gap-3">
                <EventEditor
                  draft={draft}
                  saving={updating}
                  onChange={updateDraft}
                  onSave={saveDraft}
                />
                {actionError?.id === event.id ? (
                  <p className="text-xs text-destructive">{actionError.message}</p>
                ) : null}
              </div>
            ) : actionError?.id === event.id ? (
              <p className="mt-3 text-xs text-destructive">{actionError.message}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function EventEditor({
  draft,
  saving,
  onChange,
  onSave,
}: {
  draft: EventDraft;
  saving: boolean;
  onChange: (patch: Partial<EventDraft>) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <>
      <div className="grid gap-2">
        <Label htmlFor={`title-${draft.id}`}>Title</Label>
        <Input
          id={`title-${draft.id}`}
          value={draft.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`start-${draft.id}`}>Start</Label>
          <Input
            id={`start-${draft.id}`}
            type="datetime-local"
            value={draft.startDate}
            onChange={(event) => onChange({ startDate: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`end-${draft.id}`}>End</Label>
          <Input
            id={`end-${draft.id}`}
            type="datetime-local"
            value={draft.endDate}
            onChange={(event) => onChange({ endDate: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`location-${draft.id}`}>Location</Label>
          <Input
            id={`location-${draft.id}`}
            value={draft.location}
            onChange={(event) => onChange({ location: event.target.value })}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`city-${draft.id}`}>City</Label>
          <Input
            id={`city-${draft.id}`}
            value={draft.city}
            onChange={(event) => onChange({ city: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`status-${draft.id}`}>Status</Label>
        <select
          id={`status-${draft.id}`}
          className={cn(
            "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          value={draft.status}
          onChange={(event) => {
            const nextStatus = event.target.value;
            if (EVENT_STATUS_OPTIONS.includes(nextStatus as EventStatus)) {
              onChange({ status: nextStatus as EventStatus });
            }
          }}
        >
          {EVENT_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {EVENT_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex justify-end">
        <Button type="button" disabled={saving} onClick={onSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </>
  );
}

export default SettingsView;
