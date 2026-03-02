"use client";

import * as React from "react";
import type { Treaty } from "@elysiajs/eden";
import {
  Calendar,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/eden";

type EdenEvent = NonNullable<Treaty.Data<typeof api.events.get>>[number];
type ApiEventWire = Omit<EdenEvent, "startDate"> & {
  startDate: string | Date;
};

type Event = {
  id: EdenEvent["id"];
  title: EdenEvent["title"];
  description: EdenEvent["description"];
  slug: EdenEvent["slug"];
  startDate: string;
  location: EdenEvent["location"];
  city: EdenEvent["city"];
  posterImage: EdenEvent["posterImage"];
  genre: EdenEvent["genre"];
  status?: EdenEvent["status"];
};

const EMPTY_EVENTS: Event[] = [];

function normalizeEdenEvent(item: ApiEventWire): any {
  return {
    ...item,
    startDate:
      item.startDate instanceof Date
        ? item.startDate.toISOString()
        : item.startDate,
  };
}

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

function matchesEventFilters(
  event: Event,
  query: string,
  selectedGenre: string | null,
) {
  if (event.status && event.status !== "LIVE") {
    return false;
  }

  const matchesSearch =
    event.title.toLowerCase().includes(query) ||
    (event.location ?? "").toLowerCase().includes(query) ||
    (event.description ?? "").toLowerCase().includes(query);
  const matchesGenre =
    !selectedGenre || (event.genre ?? []).includes(selectedGenre);

  return matchesSearch && matchesGenre;
}

export default function ExplorePage() {
  const [search, setSearch] = React.useState("");
  const [selectedGenre, setSelectedGenre] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await api.events.get();
      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to fetch events"));
      }
      if (!data || !Array.isArray(data)) {
        throw new Error("Failed to fetch events");
      }

      return (data as ApiEventWire[]).map(normalizeEdenEvent);
    },
  });

  const events = eventsQuery.data ?? EMPTY_EVENTS;
  const isLoading = eventsQuery.isLoading;
  const hasError = eventsQuery.isError;
  const queryError =
    eventsQuery.error instanceof Error
      ? eventsQuery.error.message
      : "Failed to fetch events";

  const normalizedSearch = search.trim().toLowerCase();

  const genres = React.useMemo(() => {
    const allGenres = events.flatMap((event) => event.genre ?? []);
    return Array.from(new Set(allGenres));
  }, [events]);

  const filteredEvents = React.useMemo(() => {
    return events.filter((event) =>
      matchesEventFilters(event, normalizedSearch, selectedGenre),
    );
  }, [events, normalizedSearch, selectedGenre]);

  return (
    <div className="min-h-screen">
      <div className="border-b bg-gradient-to-b from-muted/40 via-background to-background">
        <div className="container mx-auto max-w-6xl space-y-6 px-4 py-10">
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" />
              Curated experiences
            </p>
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Find your next night out.
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Browse live events, spotlighted creators, and local moments worth
              showing up for.
            </p>
          </div>

          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search events, venues, or vibes..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((prev) => !prev)}>
              <SlidersHorizontal className="mr-2 size-4" />
              Filters
              {selectedGenre && (
                <Badge variant="secondary" className="ml-2">
                  1
                </Badge>
              )}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              {isLoading
                ? "Loading events..."
                : `${filteredEvents.length} events live`}
            </span>
            {selectedGenre && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => setSelectedGenre(null)}>
                Clear genre
              </Button>
            )}
          </div>

          {showFilters && genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={!selectedGenre ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedGenre(null)}>
                All
              </Badge>
              {genres.map((genre) => (
                <Badge
                  key={genre}
                  variant={selectedGenre === genre ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedGenre(genre)}>
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-3/2 animate-pulse rounded-lg bg-muted" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : hasError ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-20 text-center">
            <Search className="size-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Could not load events</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {queryError}
            </p>
            <Button size="sm" onClick={() => eventsQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Events</h2>
              <span className="text-sm text-muted-foreground">
                Showing {filteredEvents.length} results
              </span>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3 py-20 text-center">
            <Search className="size-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No events found</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Try another search term or remove the filters to see everything
              live right now.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSelectedGenre(null);
              }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const start = new Date(event.startDate);
  const dateStr = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(start);

  return (
    <Link href={`/e/${event.slug}`} className="group block">
      <Card className="overflow-hidden transition hover:-translate-y-1 hover:bg-muted/50 hover:shadow-lg">
        <div className="relative aspect-3/2 overflow-hidden bg-muted">
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="bg-background/80">
              {dateStr}
            </Badge>
            {event.status === "LIVE" && (
              <Badge className="bg-emerald-500 text-white">Live</Badge>
            )}
          </div>
          {event.posterImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.posterImage}
              alt={event.title}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Calendar className="size-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>

        <CardContent className="space-y-1.5 pt-4">
          <div className="flex items-center gap-2">
            {(event.genre ?? []).slice(0, 2).map((genre: string) => (
              <Badge key={genre} variant="secondary" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
          <h3 className="line-clamp-1 font-semibold transition-colors group-hover:text-primary">
            {event.title}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {dateStr}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {event.city || event.location}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
