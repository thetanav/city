"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  MapPin,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import DynamicImg from "@/components/dynimg";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/eden";

type EventStatus = "DRAFT" | "LIVE" | "STOPPED";

type ExploreEvent = {
  id?: string;
  title: string;
  slug: string;
  startDate: string | Date;
  location: string;
  city?: string;
  status?: EventStatus;
  posterImage: string | null;
  genre: string[];
};

const PAGE_SIZE = 9;

function formatShortDate(iso: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  }).format(new Date(iso));
}

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const deferredQuery = useDeferredValue(query.trim());

  const { data: events, isFetching } = useQuery({
    queryKey: ["explore", { page, query: deferredQuery }],
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await api.events.get({
        query: {
          query: deferredQuery,
          offset: page * PAGE_SIZE,
          limit: PAGE_SIZE,
        },
      });
      return data;
    },
  });

  const resultLabel = events
    ? `${events.data.length} event${events.data.length === 1 ? "" : "s"}${deferredQuery ? ` for "${deferredQuery}"` : ""}`
    : "Loading events...";

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 pr-10"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Search events, venues, or genres"
              value={query}
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(0);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{resultLabel}</p>
            <div className="flex items-center gap-2">
              <Button
                disabled={!events?.previousPage}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                size="sm"
                variant="outline"
              >
                <ArrowLeft className="size-4" />
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1}
              </span>
              <Button
                disabled={!events?.nextPage}
                onClick={() => setPage((current) => current + 1)}
                size="sm"
                variant="outline"
              >
                Next
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="min-h-[24rem]">
        {isFetching ? (
          <LoadingGrid />
        ) : events && events.data.length > 0 ? (
          <div className="grid gap-2 grid-cols-3">
            {events.data.map((event) => (
              <EventCard key={event.slug} event={event} />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex min-h-[24rem] flex-col items-center justify-center gap-4 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">No events found</h2>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Try another search term or clear the current query.
                </p>
              </div>
              <Button
                onClick={() => {
                  setQuery("");
                  setPage(0);
                }}
                variant="outline"
              >
                Clear search
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-2 grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton className="aspect-video w-full rounded-xl" key={index} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: ExploreEvent }) {
  const dateText = formatShortDate(event.startDate);
  const cityText = event.city || event.location;

  return (
    <Link
      href={`/e/${event.slug}`}
      className="bg-card border rounded-xl overflow-clip"
    >
      <div className="">
        {event.posterImage ? (
          <DynamicImg
            alt={`${event.title} poster`}
            className="aspect-video w-full"
            src={event.posterImage}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <Calendar className="size-10 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1/2 px-2 py-2">
        <div className="flex gap-2">
          <Badge variant="secondary" className="w-fit">
            {event.status}
          </Badge>
          <div>
            <p className="text-sm text-muted-foreground">{dateText}</p>
          </div>
        </div>
        <h1 className="text-lg">{event.title}</h1>
        <div className="flex items-center gap-1 opacity-65">
          <MapPin className="size-4" />
          <span className="line-clamp-1">{cityText}</span>
        </div>
      </div>
    </Link>
  );
}
