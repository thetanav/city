"use client";

import * as React from "react";
import { Image as ImageIcon, Link2, Plus, Trash2 } from "lucide-react";
import type { Treaty } from "@elysiajs/eden";
import { useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/eden";
import { cn } from "@/lib/utils";

type Tier = {
  id: string;
  name: string;
  price: string;
  seats: string;
  note: string;
};

type EdenEventItem = NonNullable<Treaty.Data<typeof api.events.get>>[number];
type EventStatus = NonNullable<EdenEventItem["status"]>;
type CreateEventResponse = NonNullable<
  Exclude<Treaty.Data<typeof api.events.post>, { message: string }>
>;

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

function slugify(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/['-]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 3;
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

export default function EventCreator() {
  const [title, setTitle] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");
  const [hasEndDate, setHasEndDate] = React.useState(true);

  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);

  const [coverUrl, setCoverUrl] = React.useState("");
  const [status, setStatus] = React.useState<EventStatus>("DRAFT");

  const [tiers, setTiers] = React.useState<Tier[]>([
    {
      id: uid(),
      name: "General",
      price: "25",
      seats: "120",
      note: "Standard entry",
    },
    {
      id: uid(),
      name: "VIP",
      price: "75",
      seats: "25",
      note: "Front rows + early entry",
    },
  ]);

  React.useEffect(() => {
    if (slugTouched) return;
    const next = slugify(title);
    setSlug(next);
  }, [title, slugTouched]);

  React.useEffect(() => {
    if (!hasEndDate && endAt) setEndAt("");
  }, [hasEndDate, endAt]);

  const slugOk = slug.length === 0 ? true : isValidSlug(slug);
  const totalSeats = tiers.reduce((sum, t) => sum + (Number(t.seats) || 0), 0);
  const minPrice = Math.min(
    ...tiers
      .map((t) => Number(t.price))
      .filter((n) => Number.isFinite(n) && n >= 0),
  );

  function onAddTier() {
    setTiers((prev) => [
      ...prev,
      { id: uid(), name: "", price: "", seats: "", note: "" },
    ]);
  }

  function onRemoveTier(id: string) {
    setTiers((prev) => prev.filter((t) => t.id !== id));
  }

  function onUpdateTier(id: string, patch: Partial<Tier>) {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  const createEventMutation = useMutation({
    mutationFn: async () => {
      const normalizedDescription = description.replace(/\r\n/g, "\n");
      const prices = tiers.map((tier) => ({
        id: tier.id,
        name: tier.name || "General",
        price: Number(tier.price) || 0,
        seats: Number(tier.seats) || 0,
        note: tier.note || undefined,
      }));

      const { data, error } = await api.events.post({
        title,
        tagline,
        description: normalizedDescription,
        slug,
        startDate: startAt,
        endDate: hasEndDate && endAt ? endAt : undefined,
        location,
        city: "",
        creatorId: "placeholder-user-id",
        contactEmail: contactEmail.trim() || undefined,
        posterImage: coverUrl.trim() || undefined,
        status,
        prices,
        totalTickets: totalSeats,
        genre: [],
      });

      if (error) {
        throw new Error(apiErrorMessage(error.value, "Failed to create event"));
      }

      if (!data) {
        throw new Error("Failed to create event");
      }

      return data as CreateEventResponse;
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createEventMutation.mutateAsync();
      window.location.href = `/e/${created.slug}`;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to create event";
      alert(message);
    }
  }

  return (
    <div>
      <div className="space-y-1 mb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link2 className="size-3.5" />
          <span className="font-mono text-xs">/e/{slug || "your-event"}</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an event
        </h1>
        <p className="text-sm text-muted-foreground">
          Details, URL slug, cover image, and ticket tiers.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-6 lg:grid-cols-[1.25fr_.85fr]">
        <div className="grid gap-6">
          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle>Event details</CardTitle>
              <CardDescription>The basics people see first.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <div className="relative">
                  <select
                    id="status"
                    className={cn(
                      "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-xs",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                    value={status}
                    onChange={(e) => setStatus(e.target.value as EventStatus)}>
                    <option value="DRAFT">Draft</option>
                    <option value="LIVE">Live</option>
                    <option value="STOPPED">Stopped</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Night Market Sessions"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Food, music, and a little chaos"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">
                  Description (support markdown)
                </Label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is it? Who is it for?"
                  className={cn(
                    "min-h-28 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                    "placeholder:text-muted-foreground font-mono",
                    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="startAt">Start</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="endAt">End</Label>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={hasEndDate}
                        onCheckedChange={(value) =>
                          setHasEndDate(value === true)
                        }
                      />
                      Has end date
                    </label>
                  </div>
                  <Input
                    id="endAt"
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    disabled={!hasEndDate}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Warehouse 11, Downtown"
                  autoComplete="off"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="contactEmail">Contact email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="hello@nightmarket.com"
                  autoComplete="email"
                />
              </div>
            </CardContent>
          </Card>

          {/* Slug */}
          <Card>
            <CardHeader>
              <CardTitle>Event URL slug</CardTitle>
              <CardDescription>
                Lowercase letters, numbers, and hyphens.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-xs text-muted-foreground z-10">
                  /e/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(slugify(e.target.value));
                  }}
                  onBlur={() => setSlugTouched(true)}
                  className={cn("pl-7", !slugOk && "border-destructive")}
                  placeholder="night-market-sessions"
                  autoComplete="off"
                />
              </div>
              {!slugOk && (
                <p className="text-xs text-destructive">
                  Slug must be at least 3 characters and only use a-z, 0-9, and
                  hyphens.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Price Tiers */}
          <Card>
            <CardHeader>
              <CardTitle>Price tiers</CardTitle>
              <CardDescription>
                Set prices and cap seats for each tier.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3">
                {tiers.map((tier) => (
                  <div key={tier.id} className="rounded-lg border p-4">
                    <div className="grid gap-3 sm:grid-cols-[1.2fr_.7fr_.7fr_auto] sm:items-end">
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Tier name
                        </Label>
                        <Input
                          value={tier.name}
                          onChange={(e) =>
                            onUpdateTier(tier.id, { name: e.target.value })
                          }
                          placeholder="General"
                          autoComplete="off"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Price
                        </Label>
                        <Input
                          value={tier.price}
                          onChange={(e) =>
                            onUpdateTier(tier.id, {
                              price: e.target.value.replace(/[^0-9.]/g, ""),
                            })
                          }
                          inputMode="decimal"
                          placeholder="25"
                          autoComplete="off"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-xs text-muted-foreground">
                          Seats
                        </Label>
                        <Input
                          value={tier.seats}
                          onChange={(e) =>
                            onUpdateTier(tier.id, {
                              seats: e.target.value.replace(/[^0-9]/g, ""),
                            })
                          }
                          inputMode="numeric"
                          placeholder="120"
                          autoComplete="off"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => onRemoveTier(tier.id)}
                          aria-label="Remove tier">
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <Label className="text-xs text-muted-foreground">
                        Note (optional)
                      </Label>
                      <Input
                        value={tier.note}
                        onChange={(e) =>
                          onUpdateTier(tier.id, { note: e.target.value })
                        }
                        placeholder="What does this tier include?"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" onClick={onAddTier}>
                  <Plus className="size-4" />
                  Add tier
                </Button>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {totalSeats}
                  </span>{" "}
                  total seats
                  {Number.isFinite(minPrice) && minPrice >= 0 ? (
                    <span className="ml-3">
                      From{" "}
                      <span className="font-medium text-foreground">
                        ${minPrice}
                      </span>
                    </span>
                  ) : null}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="grid content-start gap-6">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Cover image</CardTitle>
              <CardDescription>Paste an image URL.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="coverUrl">Image URL</Label>
                  <Input
                    id="coverUrl"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://images.example.com/cover.jpg"
                    autoComplete="off"
                  />
                </div>
                <div className="relative overflow-hidden rounded-lg border aspect-[16/10] bg-muted">
                  {coverUrl.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt="Cover preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <ImageIcon className="size-8 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Paste an image URL
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Preview appears here
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCoverUrl("")}
                    disabled={!coverUrl.trim()}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={
                  !title ||
                  !slug ||
                  !slugOk ||
                  tiers.length === 0 ||
                  createEventMutation.isPending
                }>
                {createEventMutation.isPending ? "Creating..." : "Create event"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </form>
    </div>
  );
}
