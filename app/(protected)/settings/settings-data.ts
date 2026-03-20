"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth-client";
import { api } from "@/lib/eden";

export const QUERY_KEYS = {
  profile: ["profile"] as const,
  events: ["creator-events"] as const,
};

export type EventStatus = "DRAFT" | "LIVE" | "STOPPED";

export const EVENT_STATUS_OPTIONS: readonly EventStatus[] = ["DRAFT", "LIVE", "STOPPED"];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Draft",
  LIVE: "Live",
  STOPPED: "Stopped",
};

export type ProfileData = {
  name: string | null;
  email: string | null;
  image: string | null;
};

export type SettingsEvent = {
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

export type SettingsEventUpdate = Omit<SettingsEvent, "soldTickets" | "hasIssuedTickets">;

export type EventDraft = Pick<
  SettingsEventUpdate,
  "id" | "title" | "startDate" | "endDate" | "location" | "city" | "status"
>;

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

function unwrapApiResponse(
  response: { data: unknown; error?: { value: unknown } | null },
  fallback: string,
) {
  if (response.error) {
    throw new Error(apiErrorMessage(response.error.value, fallback));
  }

  return extractOkData(response.data, fallback);
}

function normalizeProfile(value: unknown): ProfileData {
  if (!isRecord(value)) {
    return { name: null, email: null, image: null };
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

function isEventStatus(value: unknown): value is EventStatus {
  return typeof value === "string" && EVENT_STATUS_OPTIONS.includes(value as EventStatus);
}

function normalizeEventCore(value: unknown): SettingsEventUpdate | null {
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

  return {
    id,
    title,
    slug,
    startDate,
    endDate,
    location,
    city: typeof value.city === "string" ? value.city : "",
    status: isEventStatus(value.status) ? value.status : "DRAFT",
    totalTickets,
  };
}

function normalizeEvent(value: unknown): SettingsEvent | null {
  const base = normalizeEventCore(value);
  if (!base || !isRecord(value)) return null;

  const soldTickets = value.soldTickets;
  const hasIssuedTickets = value.hasIssuedTickets;

  if (typeof soldTickets !== "number" || typeof hasIssuedTickets !== "boolean") {
    return null;
  }

  return {
    ...base,
    soldTickets,
    hasIssuedTickets,
  };
}

export function formatWhen(iso: string) {
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

export function eventToDraft(event: SettingsEvent): EventDraft {
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

export function statusVariant(status: EventStatus): "success" | "warning" | "outline" {
  if (status === "LIVE") return "success";
  if (status === "STOPPED") return "warning";
  return "outline";
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useSettingsData() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: async () => {
      return normalizeProfile(
        unwrapApiResponse(await api.profiles.get(), "Failed to load profile"),
      );
    },
  });

  const eventsQuery = useQuery({
    queryKey: QUERY_KEYS.events,
    queryFn: async () => {
      const items = unwrapApiResponse(await api.events.mine.get(), "Failed to load events");

      if (!Array.isArray(items)) {
        throw new Error("Failed to load events");
      }

      return items.map(normalizeEvent).filter((event): event is SettingsEvent => event !== null);
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      return normalizeProfile(
        unwrapApiResponse(await api.profiles.put(payload), "Failed to save profile"),
      );
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

      const updated = normalizeEventCore(
        unwrapApiResponse(
          await endpoint.put({
            title: draft.title,
            startDate: draft.startDate,
            endDate: draft.endDate,
            location: draft.location,
            city: draft.city,
            status: draft.status,
          }),
          "Failed to update event",
        ),
      );

      if (!updated) {
        throw new Error("Failed to update event");
      }

      return updated;
    },
    onSuccess: (updated, draft) => {
      queryClient.setQueryData<SettingsEvent[]>(QUERY_KEYS.events, (current) => {
        if (!current) return current;

        return current.map((event) => (event.id === draft.id ? { ...event, ...updated } : event));
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const endpoint = api.events({ id });
      if (!("delete" in endpoint)) {
        throw new Error("Delete route unavailable");
      }

      unwrapApiResponse(await endpoint.delete(), "Failed to delete event");
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<SettingsEvent[]>(QUERY_KEYS.events, (current) => {
        return current?.filter((event) => event.id !== id) ?? current;
      });
    },
  });

  const profileError = profileQuery.isError
    ? messageFromError(profileQuery.error, "Failed to load profile")
    : null;

  const eventsError = eventsQuery.isError
    ? messageFromError(eventsQuery.error, "Failed to load events")
    : null;

  const saveProfileError = updateProfileMutation.isError
    ? messageFromError(updateProfileMutation.error, "Failed to save profile")
    : null;

  return {
    sessionName: session?.user?.name ?? "Guest",
    sessionEmail: session?.user?.email ?? "Not signed in",
    profile: profileQuery.data,
    profileLoading: profileQuery.isLoading,
    profileError,
    profileSaving: updateProfileMutation.isPending,
    saveProfileError,
    saveProfile: async (name: string) => {
      await updateProfileMutation.mutateAsync({ name });
    },
    events: eventsQuery.data ?? [],
    eventsLoading: eventsQuery.isLoading,
    eventsError,
    updatingEvent: updateEventMutation.isPending,
    deletingId: deleteEventMutation.isPending ? (deleteEventMutation.variables ?? null) : null,
    updateEvent: async (draft: EventDraft) => {
      await updateEventMutation.mutateAsync(draft);
    },
    deleteEvent: async (id: string) => {
      await deleteEventMutation.mutateAsync(id);
    },
  };
}
