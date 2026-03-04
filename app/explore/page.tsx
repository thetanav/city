"use client";

import { Calendar, MapPin, Search, X } from "lucide-react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/eden";
import { useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import DynamicImg from "@/components/dynimg";

type EventStatus = "DRAFT" | "LIVE" | "STOPPED";

type ExploreEvent = {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  location: string;
  city: string;
  status: EventStatus;
  posterImage: string | null;
  genre: string[];
};

function formatShortDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

export default function ExplorePage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const {
    data: events,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["explore"],
    queryFn: async () => {
      const { data } = await api.events.get({
        query: {
          query,
          offset: page * 10,
          limit: 10,
        },
      });
      return data;
    },
  });

  return (
    <div className="min-h-screen px-3">
      <div className="container mx-auto max-w-6xl space-y-6 px-0 pt-10">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Find your next night out.
        </h1>

        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              placeholder="Search events, venues, or vibes..."
              className="pl-8 py-2 pr-8"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
                refetch();
              }}
            />
            {query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="h-fit w-full flex justify-between items-center my-2">
        <p className="text-sm text-muted-foreground">
          Total pages: {events?.totalPages}
        </p>
        <div>
          <Pagination className="w-fit">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  className={`${!events?.previousPage && "opacity-60 pointer-events-none"}`}
                  onClick={() => {
                    if (events?.previousPage) {
                      setPage(page - 1);
                      refetch();
                    }
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink>{page + 1}</PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  className={`${!events?.nextPage && "opacity-60 pointer-events-none"}`}
                  onClick={() => {
                    if (events?.nextPage) {
                      setPage(page + 1);
                      refetch();
                    }
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {isFetching && <LoadingGrid />}
      {!isFetching && events && (
        <div className="grid grid-cols-1 gap-3 space-y-4 sm:grid-cols-3 lg:grid-cols-3">
          {events.data.map((event) => (
            <EventCard key={event.slug} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 space-y-4 sm:grid-cols-3 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div key={item} className="space-y-3">
          <div className="aspect-9/12 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const dateText = formatShortDate(event.startDate);

  return (
    <Link
      href={`/e/${event.slug}`}
      className="group focus-within:scale-95 transition-transform select-none"
    >
      <div className="aspect-9/12">
        {event.posterImage ? (
          <DynamicImg
            src={event.posterImage}
            className="h-full w-full rounded-lg"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-lg border">
            <Calendar className="size-8 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="space-y-1.5 pt-2 px-1">
        {event.genre.length > 0 && (
          <div className="flex items-center gap-2">
            {event.genre.slice(0, 2).map((genre) => (
              <Badge key={genre} variant="info" className="text-xs">
                {genre}
              </Badge>
            ))}
          </div>
        )}
        <h3 className="line-clamp-1 font-semibold text-md group-hover:underline">
          {event.title}
        </h3>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            {dateText}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="size-3.5" />
            {event.city || event.location}
          </span>
        </div>
      </div>
    </Link>
  );
}
