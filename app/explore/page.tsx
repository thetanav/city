"use client";

import { Calendar, MapPin, Search, X, Sparkles, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence, Variants } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/eden";
import { useEffect, useState } from "react";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import DynamicImg from "@/components/dynimg";

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

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

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
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query]);

  const { data: events, isFetching } = useQuery({
    queryKey: ["explore", { page, query: debouncedQuery }],
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await api.events.get({
        query: {
          query: debouncedQuery,
          offset: page * 10,
          limit: 10,
        },
      });
      return data;
    },
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Section */}
      <section className="relative py-12 px-1">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 max-w-3xl"
        >
          <Badge variant="secondary" className="px-3 py-1 gap-1.5 bg-primary/10 text-primary border-none">
            <Sparkles className="size-3" />
            Featured Experiences
          </Badge>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Find your next <span className="text-primary">night out.</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl">
            Discover the best concerts, workshops, and social gatherings happening in your city.
          </p>
        </motion.div>
      </section>

      {/* Search & Filters */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="sticky top-20 z-30 bg-background/80 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search events, venues, or vibes..."
              className="pl-11 h-12 bg-muted/40 border-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all rounded-xl"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
            <AnimatePresence>
              {query.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                  className="absolute top-1/2 right-3 -translate-y-1/2 p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                >
                  <X className="size-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
          <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 md:hidden">
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>
      </motion.div>

      {/* Pagination & Status */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-sm font-medium text-muted-foreground">
          {events ? `Showing ${events.data.length} events` : 'Loading events...'}
        </p>
        
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <Button
                variant="ghost"
                size="sm"
                disabled={!events?.previousPage}
                onClick={() => setPage(page - 1)}
                className="gap-1"
              >
                <PaginationPrevious className="h-4 w-4" />
                <span>Prev</span>
              </Button>
            </PaginationItem>
            <PaginationItem>
              <div className="px-3 py-1 text-sm font-bold bg-primary/10 text-primary rounded-md">
                {page + 1}
              </div>
            </PaginationItem>
            <PaginationItem>
              <Button
                variant="ghost"
                size="sm"
                disabled={!events?.nextPage}
                onClick={() => setPage(page + 1)}
                className="gap-1"
              >
                <span>Next</span>
                <PaginationNext className="h-4 w-4" />
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Grid */}
      <div className="min-h-[400px]">
        {isFetching ? (
          <LoadingGrid />
        ) : events && events.data.length > 0 ? (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
          >
            {events.data.map((event) => (
              <motion.div key={event.slug} variants={item}>
                <EventCard event={event} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="bg-muted p-6 rounded-full mb-4">
              <Search className="size-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold">No events found</h3>
            <p className="text-muted-foreground max-w-xs mt-2">
              Try adjusting your search or filters to find what you&apos;re looking for.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => setQuery("")}>
              Clear all searches
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
      {[1, 2, 3, 4, 5, 6].map((idx) => (
        <div key={idx} className="space-y-4">
          <Skeleton className="aspect-[3/4] w-full rounded-2xl" />
          <div className="space-y-2 px-1">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="h-7 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventCard({ event }: { event: ExploreEvent }) {
  const dateText = formatShortDate(event.startDate);

  return (
    <Link
      href={`/e/${event.slug}`}
      className="group block select-none"
    >
      <div className="space-y-4">
        {/* Poster Container */}
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-sm border bg-muted">
          {event.posterImage ? (
            <DynamicImg
              src={event.posterImage}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Calendar className="size-12 text-muted-foreground/20" />
            </div>
          )}
          
          {/* Overlay info */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
             <Button variant="secondary" size="sm" className="w-full font-bold">
               Get Tickets
             </Button>
          </div>
          
          {/* Top Badge */}
          <div className="absolute top-3 left-3">
             <div className="bg-background/90 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold shadow-sm flex items-center gap-1.5 border border-primary/10">
               <div className="size-1.5 rounded-full bg-primary animate-pulse" />
               LIVE
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-2 px-1">
          {event.genre.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {event.genre.slice(0, 2).map((genre) => (
                <Badge key={genre} variant="outline" className="text-[10px] uppercase font-bold tracking-wider py-0 px-1.5 bg-muted/50 border-none text-muted-foreground">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
          
          <h3 className="font-bold text-xl group-hover:text-primary transition-colors line-clamp-1 leading-tight">
            {event.title}
          </h3>
          
          <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground/80">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4 text-primary/60" />
              {dateText}
            </span>
            <span className="flex items-center gap-1.5 border-l pl-4">
              <MapPin className="size-4 text-primary/60" />
              <span className="line-clamp-1">{event.city || event.location}</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
