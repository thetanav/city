"use client";

import * as React from "react";
import { Search, MapPin, Calendar, X, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Event = {
  id: string;
  title: string;
  description: string;
  slug: string;
  startDate: string;
  location: string;
  city: string | null;
  posterImage: string | null;
  genre: string[];
};

export default function ExplorePage() {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [selectedGenre, setSelectedGenre] = React.useState<string | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/events")
      .then((res) => res.json())
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch events:", err);
        setLoading(false);
      });
  }, []);

  const genres = React.useMemo(() => {
    const allGenres = events.flatMap((e) => e.genre || []);
    return Array.from(new Set(allGenres));
  }, [events]);

  const filteredEvents = React.useMemo(() => {
    return events.filter((e) => {
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
      <div className="border-b">
        <div className="container max-w-6xl mx-auto px-4 py-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                className="pl-6"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Search className="size-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No events found</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              Try adjusting your search or filters.
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
      <Card className="overflow-hidden transition-colors hover:bg-muted/50">
        {/* Image */}
        <div className="aspect-[3/2] overflow-hidden bg-muted">
          {event.posterImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.posterImage}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="size-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <CardContent className="pt-4 space-y-1.5">
          <div className="flex items-center gap-2">
            {event.genre?.slice(0, 2).map((g) => (
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
