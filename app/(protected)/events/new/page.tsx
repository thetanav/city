"use client";

import * as React from "react";
import {
  Check,
  Image as ImageIcon,
  Loader,
  Lock,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/eden";
import { formatMoney } from "@/lib/ticketing";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toastManager } from "@/components/ui/toast";
import TimeForm from "@/components/timeform";
import DynamicImg from "@/components/dynimg";

type Tier = {
  id: string;
  name: string;
  price: string;
  seats: string;
  note: string;
};

type EventStatus = "DRAFT" | "LIVE" | "STOPPED";

function slugify(raw: string) {
  return raw
    .toLowerCase()
    .trim()
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
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [tagline, setTagline] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [startAt, setStartAt] = React.useState("");
  const [hasEndDate, setHasEndDate] = React.useState(true);
  const [endAt, setEndAt] = React.useState("");

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

  const slugQuery = useQuery({
    queryKey: ["slug-check", slug],
    queryFn: async () => {
      if (!slug || !isValidSlug(slug)) return null;
      const { data } = await api.events.check({ slug }).get();
      return data;
    },
    enabled: slug.length >= 3 && isValidSlug(slug),
  });

  const slugExists = slugQuery.data?.exists === true;

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
  const parsedStartAt = startAt ? new Date(startAt) : null;
  const parsedEndAt = endAt ? new Date(endAt) : null;
  const hasStartDate = Boolean(startAt);
  const hasRequiredBasics =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    location.trim().length > 0;
  const tiersHaveValidValues = tiers.every((tier) => {
    const price = Number(tier.price);
    const seats = Number(tier.seats);

    return (
      tier.name.trim().length > 0 &&
      Number.isFinite(price) &&
      price >= 0 &&
      Number.isFinite(seats) &&
      seats > 0
    );
  });
  const hasValidEndDate =
    !hasEndDate ||
    (Boolean(endAt) &&
      Boolean(parsedStartAt) &&
      Boolean(parsedEndAt) &&
      parsedEndAt!.getTime() >= parsedStartAt!.getTime());
  const canSubmit =
    hasRequiredBasics &&
    hasStartDate &&
    hasValidEndDate &&
    slugOk &&
    slug.length > 0 &&
    !slugExists &&
    !slugQuery.isLoading &&
    tiers.length > 0 &&
    tiersHaveValidValues;

  const completionChecks = [
    { label: "Basics", done: hasRequiredBasics },
    { label: "Schedule", done: hasStartDate && hasValidEndDate },
    { label: "Slug", done: slug.length > 0 && slugOk && !slugExists },
    { label: "Tickets", done: tiers.length > 0 && tiersHaveValidValues },
  ];
  const completedCount = completionChecks.filter((check) => check.done).length;

  const submitHint = (() => {
    if (!hasRequiredBasics) return "Fill title, description, and location.";
    if (!hasStartDate) return "Pick a start date to continue.";
    if (!hasValidEndDate) return "End must be later than start.";
    if (!slug.length || !slugOk) return "Enter a valid slug.";
    if (slugExists) return "Slug is already taken.";
    if (!tiers.length || !tiersHaveValidValues)
      return "Complete all tier name, price, and seats fields.";

    return "Looks good. Ready to create event.";
  })();

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

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const normalizedDescription = description.replace(/\r\n/g, "\n");
      const prices = tiers.map((tier) => ({
        id: tier.id,
        name: tier.name || "General",
        price: Number(tier.price) || 0,
        seats: Number(tier.seats) || 0,
        note: tier.note.trim() || undefined,
      }));

      const { data } = await api.events.post({
        title,
        tagline: tagline || undefined,
        description: normalizedDescription,
        slug,
        startDate: startAt,
        endDate: hasEndDate && endAt ? endAt : undefined,
        location,
        city: undefined,
        contactEmail: contactEmail.trim() || undefined,
        posterImage: coverUrl.trim() || undefined,
        status,
        prices,
        totalTickets: totalSeats,
        genre: [],
      });

      if (data) {
        toastManager.add({
          title: data.message,
          type: data.ok ? "success" : "error",
        });
      }
      if (data?.ok) {
        router.push(`/e/${(data.data as { slug?: string })?.slug}`);
      }

      return data;
    },
  });

  const statusList = [
    { label: "Not listed", value: "DRAFT" },
    { label: "Available for buyers", value: "LIVE" },
    { label: "Stopped for buyers", value: "STOPPED" },
  ];

  return (
    <div>
      <div className="space-y-1 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create an event
        </h1>
      </div>

      <form
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-6 lg:grid-cols-[1.25fr_.85fr]">
        <div className="grid gap-6">
          {/* Event Details */}
          <section className="rounded-xl border bg-background p-5 sm:p-6">
            <div className="mb-5 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Event details</h2>
              <p className="text-sm text-muted-foreground">
                The basics people see first.
              </p>
            </div>
            <div className="grid gap-7">
              <div className="grid gap-2">
                <Label htmlFor="status">Status</Label>
                <div>
                  <Select
                    aria-label="Select status for event"
                    defaultValue="DRAFT"
                    items={statusList}
                    onValueChange={(value) => {
                      setStatus(value as EventStatus);
                    }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectPopup alignItemWithTrigger={false}>
                      {statusList.map(({ label, value }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectPopup>
                  </Select>
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
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Keep it short and memorable.
                </p>
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
                  Description (supports markdown)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is it? Who is it for?"
                  className="font-mono"
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Include highlights, timing, and what attendees should expect.
                </p>
              </div>

              <TimeForm
                startAt={startAt}
                endAt={endAt}
                hasEndDate={hasEndDate}
                onStartAtChange={setStartAt}
                onEndAtChange={setEndAt}
                onHasEndDateChange={setHasEndDate}
              />

              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Warehouse 11, Downtown"
                  autoComplete="off"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Add venue name and area for faster discovery.
                </p>
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
            </div>
          </section>

          {/* Slug */}
          <section className="rounded-xl border bg-background p-5 sm:p-6">
            <div className="mb-5 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Event URL slug
              </h2>
              <p className="text-sm text-muted-foreground">
                Lowercase letters, numbers, and hyphens.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 select-none text-sm font-mono text-muted-foreground z-10">
                  /e/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugTouched(true);
                  }}
                  className={cn(
                    "px-11 py-1 font-mono",
                    !slugOk && "border-destructive",
                  )}
                  placeholder="night-market-sessions"
                  autoComplete="off"
                  required
                />
                <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 select-none text-xs text-muted-foreground z-10">
                  {slugQuery.isLoading ? (
                    <Loader className="size-4 animate-spin" />
                  ) : slugExists ? (
                    <X className="size-4 text-destructive" />
                  ) : slug && slugOk ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : null}
                </div>
              </div>
              <ul className="list-disc ml-4">
                {!slugOk && slug.length > 0 && (
                  <li className="text-xs text-destructive">
                    Slug must be at least 3 characters and only use a-z, 0-9,
                    and hyphens.
                  </li>
                )}
                {slugExists && (
                  <li className="text-xs text-destructive">
                    This slug is already used by another event. Pick a different
                    one.
                  </li>
                )}
                {slugQuery.isLoading && slug.length >= 3 && slugOk && (
                  <li className="text-xs text-muted-foreground">
                    Checking slug availability...
                  </li>
                )}
              </ul>
            </div>
          </section>

          {/* Price Tiers */}
          <section className="rounded-xl border bg-background p-5 sm:p-6">
            <div className="mb-5 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Price tiers</h2>
              <p className="text-sm text-muted-foreground">
                Set prices and cap seats for each tier.
              </p>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-3">
                {tiers.map((tier) => (
                  <div
                    key={tier.id}
                    className="grid gap-2 sm:grid-cols-[1.2fr_.7fr_.7fr_auto] sm:items-end">
                    <div>
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
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Price (₹)
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
                        required
                      />
                    </div>
                    <div>
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
                        required
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => onRemoveTier(tier.id)}
                        disabled={tiers.length === 1}
                        aria-label="Remove tier">
                        <Trash2 className="size-4" />
                      </Button>
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
                        {formatMoney(minPrice)}
                      </span>
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="grid content-start gap-6">
          <section className="rounded-xl border bg-background p-5 sm:p-6">
            <div className="mb-5 space-y-1">
              <h2 className="flex items-center justify-between gap-2 text-lg font-semibold tracking-tight">
                Form progress
                <Badge
                  variant={
                    completedCount === completionChecks.length
                      ? "success"
                      : "info"
                }>
                  {completedCount}/{completionChecks.length}
                </Badge>
              </h2>
              <p className="text-sm text-muted-foreground">
                Complete all checks to unlock event creation.
              </p>
            </div>
            <div className="grid gap-2">
              {completionChecks.map((check) => (
                <div
                  key={check.label}
                  className="flex items-center justify-between rounded-md border px-3 py-2">
                  <p className="text-sm">{check.label}</p>
                  {check.done ? (
                    <Badge variant="success">Done</Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </div>
              ))}
              <p
                className={cn(
                  "text-xs",
                  canSubmit ? "text-emerald-600" : "text-muted-foreground",
                )}>
                {canSubmit ? (
                  "All required details are complete."
                ) : (
                  <>
                    <Lock className="mr-1 inline size-3" />
                    {submitHint}
                  </>
                )}
              </p>
            </div>
          </section>

          <section className="sticky top-20 rounded-xl border bg-background p-5 sm:p-6">
            <div className="mb-5 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">Cover image</h2>
              <p className="text-sm text-muted-foreground">Paste an image URL.</p>
            </div>
            <div>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="coverUrl">Image URL</Label>
                  <Input
                    id="coverUrl"
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://images.example.com/cover.jpg"
                    autoComplete="off"
                  />
                </div>
                <div className="relative overflow-hidden rounded-lg border aspect-16/10 bg-muted">
                  {coverUrl.trim() ? (
                    <DynamicImg
                      alt="Cover preview"
                      className="h-full w-full"
                      src={coverUrl}
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
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={!canSubmit || isPending}
                onClick={() => mutate()}>
                {isPending ? "Creating..." : "Create event"}
              </Button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
