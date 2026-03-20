import Link from "next/link";
import { ArrowRight } from "lucide-react";

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

const highlights = [
  "Publish an event page in minutes.",
  "Sell tickets with a clean checkout flow.",
  "Track sales and check-in from one place.",
] as const;

const stats = [
  { label: "Events", value: "1.2k+" },
  { label: "Tickets", value: "98k" },
  { label: "Check-in", value: "12 sec" },
] as const;

export default function Page() {
  return (
    <div className="space-y-10 py-2 sm:py-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardHeader className="space-y-4">
            <Badge variant="secondary" className="w-fit">
              City beta
            </Badge>
            <div className="space-y-3">
              <CardTitle className="text-4xl leading-tight sm:text-5xl">
                Event ops without the clutter.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                City gives hosts a simple way to publish events, sell tickets, and run the door from
                one place.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {highlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/explore">
                Explore events
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/events/new">Create an event</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At a glance</CardTitle>
            <CardDescription>Simple numbers for the core flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className="text-2xl font-semibold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">
          Built for hosts who want fewer moving parts
        </h2>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          The public pages, member home, and organizer views now share the same plain `shadcn`
          structure: clear type, standard spacing, and basic cards instead of custom marketing
          styling.
        </p>
      </section>
    </div>
  );
}
