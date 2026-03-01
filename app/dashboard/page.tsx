"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Calendar, 
  Plus, 
  LayoutDashboard,
  ArrowUpRight,
  Users,
  TrendingUp,
  Search,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence, type Variants } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: string;
  title: string;
  slug: string;
  startDate: string;
  location: string;
  totalTickets: number;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 24 
    } 
  }
};

export default function DashboardOverview() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch("/api/events");
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const filteredEvents = events.filter(e => 
    e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 selection:bg-zinc-500/30">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] pointer-events-none mix-blend-overlay" />
      
      <div className="max-w-7xl mx-auto px-6 py-16 space-y-16 relative">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-800/50 pb-12">
          <div className="space-y-4">
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-zinc-500 font-mono text-xs uppercase tracking-[0.2em]"
            >
              <LayoutDashboard className="size-3" />
              <span>Admin Control Center</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-6xl font-medium tracking-tight leading-tight"
            >
              Creator <span className="text-zinc-500">Workspace</span>
            </motion.h1>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Button 
              render={<Link href="/events/new" />} 
              size="lg" 
              className="h-14 px-8 rounded-full bg-zinc-100 text-zinc-950 hover:bg-zinc-300 transition-all font-medium flex items-center gap-3 border-none shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Plus className="size-5" />
              <span>Create Event</span>
            </Button>
          </motion.div>
        </header>

        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-1"
        >
          {[
            { label: "Active Events", value: events.length, icon: Calendar },
            { label: "Total Attendees", value: "1.2k", icon: Users, trend: "+12%" },
            { label: "Revenue", value: "$42.5k", icon: TrendingUp, trend: "+8.2%" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              variants={item}
              className="group relative p-8 bg-zinc-900/20 border border-zinc-800/50 hover:bg-zinc-800/30 transition-all cursor-default"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-4xl font-light tracking-tighter">{stat.value}</p>
                </div>
                <stat.icon className="size-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
              {stat.trend && (
                <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-500/80 font-mono">
                  <TrendingUp className="size-3" />
                  <span>{stat.trend} from last month</span>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

        <div className="space-y-8">
          <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
            <h2 className="text-2xl font-medium">Events</h2>
            <div className="flex items-center gap-4">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="Search events..."
                  className="bg-zinc-900/50 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:outline-none focus:ring-1 focus:ring-zinc-700 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" className="rounded-full border-zinc-800 hover:bg-zinc-800">
                <Filter className="size-4" />
              </Button>
            </div>
          </div>

          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <AnimatePresence mode="popLayout">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <motion.div 
                    key={`skeleton-${i}`} 
                    variants={item}
                    className="aspect-[4/5] rounded-[2rem] bg-zinc-900/40 border border-zinc-800/50 animate-pulse" 
                  />
                ))
              ) : filteredEvents.length > 0 ? (
                filteredEvents.map((event) => (
                  <motion.div key={event.id} variants={item} layout>
                    <Link href={`/dashboard/${event.id}`} className="group block h-full">
                      <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-zinc-900/20 border border-zinc-800/50 hover:border-zinc-700/80 transition-all duration-500">
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        
                        <div className="absolute inset-0 p-8 flex flex-col justify-between">
                          <div className="flex justify-between items-start">
                            <div className="px-3 py-1 rounded-full bg-zinc-800/50 backdrop-blur-md border border-zinc-700/50 text-[10px] font-mono uppercase tracking-widest text-zinc-300">
                              {format(new Date(event.startDate), "MMM d, yyyy")}
                            </div>
                            <div className="size-10 rounded-full bg-zinc-100 text-zinc-950 flex items-center justify-center opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                              <ArrowUpRight className="size-5" />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <h3 className="text-3xl font-medium leading-tight group-hover:text-zinc-100 transition-colors">
                              {event.title}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="rounded-full border-zinc-800 text-zinc-500 bg-transparent text-[10px] py-0 px-2 uppercase tracking-tighter">
                                {event.location}
                              </Badge>
                              <Badge variant="outline" className="rounded-full border-zinc-800 text-zinc-500 bg-transparent text-[10px] py-0 px-2 uppercase tracking-tighter">
                                {event.totalTickets} Tickets
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  variants={item}
                  className="col-span-full py-32 text-center space-y-8"
                >
                  <div className="size-24 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-700">
                    <LayoutDashboard className="size-10 stroke-[1px]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-2xl font-medium">Void of Events</h3>
                    <p className="text-zinc-500 max-w-sm mx-auto">Your cosmic dashboard is currently empty. Initiate your first event to populate the grid.</p>
                  </div>
                  <Button 
                    render={<Link href="/events/new" />} 
                    variant="outline" 
                    className="h-12 px-6 rounded-full border-zinc-800 hover:bg-zinc-900 transition-colors"
                  >
                    Launch New Event
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
