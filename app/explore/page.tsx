"use client";

import * as React from "react";
import type { Treaty } from "@elysiajs/eden";
import {
  Search,
  MapPin,
  Calendar,
  X,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/eden";
import { cn } from "@/lib/utils";

type EdenEvent = NonNullable<Treaty.Data<typeof api.events.get>>[number];
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

function normalizeEdenEvent(item: EdenEvent): Event {
  return {
    ...item,
    startDate: item.startDate.toISOString(),
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

export default function ExplorePage() {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedGenre, setSelectedGenre] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    const loadEvents = async () => {
      try {
        const { data, error } = await api.events.get();
        if (error) {
          throw new Error(
            apiErrorMessage(error.value, "Failed to fetch events"),
          );
        }
        if (!data) {
          throw new Error("Failed to fetch events");
        }
        const items = Array.isArray(data) ? (data as EdenEvent[]) : [];
        setEvents(items.map(normalizeEdenEvent));
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoading(false);
      }
    };

    loadEvents();
  }, []);

  const genres = React.useMemo(() => {
    const allGenres = events.flatMap((e) => e.genre || []);
    return Array.from(new Set(allGenres));
  }, [events]);

  const filteredEvents = React.useMemo(() => {
    return events.filter((e) => {
      if (e.status && e.status !== "LIVE") return false;
      const matchesSearch =
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.location.toLowerCase().includes(search.toLowerCase()) ||
        (e.description &&
          e.description.toLowerCase().includes(search.toLowerCase()));
      const matchesGenre =
        !selectedGenre || (e.genre && e.genre.includes(selectedGenre));
      return matchesSearch && matchesGenre;
    });
  }, [events, search, selectedGenre]);

  return (
    <div className="min-h-screen">
      {/* Search Header */}
      <div className="border-b bg-gradient-to-b from-muted/40 via-background to-background">
        <div className="container max-w-6xl mx-auto px-4 py-10 space-y-6">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              Curated experiences
            </p>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Find your next night out.
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Browse live events, spotlighted creators, and local moments worth
              showing up for.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search events, venues, or vibes..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}>
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
              {loading
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

      {/* Results */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/2] rounded-lg bg-muted animate-pulse" />
                <div className="h-4 w-2/3 bg-muted animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Events</h2>
              <span className="text-sm text-muted-foreground">
                Showing {filteredEvents.length} results
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Search className="size-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No events found</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
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
        {/* Image */}
        <div className="relative aspect-[3/2] overflow-hidden bg-muted">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
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
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="size-8 text-muted-foreground" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        </div>

        <CardContent className="pt-4 space-y-1.5">
          <div className="flex items-center gap-2">
            {event.genre?.slice(0, 2).map((g: any) => (
              <Badge key={g} variant="secondary" className="text-xs">
                {g}
              </Badge>
            ))}
          </div>
          <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
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
