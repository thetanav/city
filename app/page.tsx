import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CalendarCheck,
  Sparkles,
  Ticket,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default async function Page() {
  const featureItems = [
    {
      title: "Ticketing that feels instant",
      description:
        "One-click checkout, smart tiers, and QR codes ready for the door.",
      icon: Ticket,
    },
    {
      title: "Organize with confidence",
      description:
        "Stay on top of sales, capacity, and guest flow with live signals.",
      icon: CalendarCheck,
    },
    {
      title: "Built for trust",
      description:
        "Verified attendees, secure payments, and clean digital receipts.",
      icon: ShieldCheck,
    },
  ] as const;

  const stats = [
    { label: "Events launched", value: "1.2k+" },
    { label: "Tickets delivered", value: "98k" },
    { label: "Avg. check-in time", value: "12 sec" },
  ] as const;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(14,165,233,0.16),transparent_65%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-1/2 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(236,72,153,0.12),transparent_70%)]" />

      <section className="container px-4 md:px-6 py-24 md:py-32">
        <div className="mx-auto max-w-5xl text-center space-y-8">
          <Badge variant="secondary" className="mx-auto w-fit">
            City beta is live
          </Badge>
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
              Next generation events
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight">
              Events that feel alive, from the first invite to the last encore.
            </h1>
            <p className="mx-auto max-w-2xl text-base md:text-lg text-muted-foreground">
              City is the operating system for standout experiences. Launch
              tickets, manage your crowd, and grow a community that keeps
              showing up.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/explore">
              <Button size="lg">
                Explore events
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
            <Link href="/events/new">
              <Button variant="outline" size="lg">
                Create an event
              </Button>
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 pt-6">
            {stats.map((stat) => (
              <Card key={stat.label} className="bg-background/70">
                <CardContent className="py-6">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container px-4 md:px-6 pb-24">
        <div className="mx-auto max-w-5xl space-y-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Built for creators
              </p>
              <h2 className="text-2xl md:text-3xl font-semibold mt-2">
                Everything you need to launch in a weekend, scale all season.
              </h2>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" className="gap-2">
                See the dashboard
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {featureItems.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-muted/60">
                  <CardContent className="pt-6 space-y-3">
                    <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
