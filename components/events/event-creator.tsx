"use client";

import * as React from "react";
import { Image as ImageIcon, Link2, Plus, Trash2 } from "lucide-react";

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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Tier = {
  id: string;
  name: string;
  price: string;
  seats: string;
  note: string;
};

function slugify(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/['-]/g, "")
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
  const [startAt, setStartAt] = React.useState("");
  const [endAt, setEndAt] = React.useState("");

  const [slug, setSlug] = React.useState("");
  const [slugTouched, setSlugTouched] = React.useState(false);

  const [coverFile, setCoverFile] = React.useState<File | null>(null);
  const [coverUrl, setCoverUrl] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
    if (!coverFile) {
      setCoverUrl(null);
      return;
    }
    const url = URL.createObjectURL(coverFile);
    setCoverUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const slugOk = slug.length === 0 ? true : isValidSlug(slug);
  const totalSeats = tiers.reduce((sum, t) => sum + (Number(t.seats) || 0), 0);
  const minPrice = Math.min(
    ...tiers
      .map((t) => Number(t.price))
      .filter((n) => Number.isFinite(n) && n >= 0),
  );

  function onPickCover(file: File | null) {
    if (!file) {
      setCoverFile(null);
      return;
    }
    if (!file.type.startsWith("image/")) return;
    setCoverFile(file);
  }

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

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title,
      tagline,
      description,
      location,
      startAt,
      endAt,
      slug,
      tiers,
      coverFile: coverFile
        ? { name: coverFile.name, type: coverFile.type }
        : null,
    };
    // Wire this to your API route later.
    console.log("create-event", payload);
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="relative p-6 sm:p-10">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1">
              <Link2 className="size-3.5" />
              {slug ? (
                <span className="font-mono">/e/{slug}</span>
              ) : (
                <span className="font-mono">/e/your-event</span>
              )}
            </span>
            <span className="hidden sm:inline">Draft creator</span>
          </div>
          <h1 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            Create an event
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Details, URL slug, cover image, and ticket tiers with seat caps.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_.85fr]">
          <div className="grid gap-6">
            <Card className="bg-background/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Event details</CardTitle>
                <CardDescription>
                  The basics people see first. Keep it tight and specific.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-5">
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
                  <Label htmlFor="description">Description</Label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What is it? Who is it for? What should people expect?"
                    className={cn(
                      "min-h-28 w-full resize-y rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none",
                      "placeholder:text-muted-foreground",
                      "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                    )}
                  />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
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
                    <Label htmlFor="endAt">End</Label>
                    <Input
                      id="endAt"
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
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
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Event URL slug</CardTitle>
                <CardDescription>
                  Lowercase letters, numbers, and hyphens. Example:
                  my-event-2026
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 select-none text-xs text-muted-foreground">
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
                    className={cn("pl-10", !slugOk && "border-destructive")}
                    placeholder="night-market-sessions"
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>
                {!slugOk && (
                  <p className="text-xs text-destructive">
                    Slug must be at least 3 characters and only use a-z, 0-9,
                    and hyphens.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-background/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Price tiers</CardTitle>
                <CardDescription>
                  Add tiers, set prices, and cap seats for each tier.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="grid gap-3">
                  {tiers.map((tier) => (
                    <div
                      key={tier.id}
                      className="rounded-xl border bg-background/70 p-4 shadow-sm">
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
                  <div className="text-xs text-muted-foreground">
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
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid content-start gap-6">
            <Card className="sticky top-6 bg-background/80 backdrop-blur">
              <CardHeader>
                <CardTitle>Cover image</CardTitle>
                <CardDescription>
                  Upload a wide image. Drag & drop works.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files?.[0] ?? null;
                    onPickCover(file);
                  }}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-background/70",
                    "aspect-[16/10]",
                  )}>
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt="Cover preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div className="grid size-12 place-items-center rounded-2xl border bg-background/80 shadow-sm">
                          <ImageIcon className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Drop an image</p>
                          <p className="text-xs text-muted-foreground">
                            or click to upload
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 focus:outline-none">
                    <span className="sr-only">Upload cover image</span>
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPickCover(e.target.files?.[0] ?? null)}
                />
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {coverFile ? coverFile.name : "No image selected"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCoverFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    disabled={!coverFile}>
                    Remove
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto">
                  Save draft
                </Button>
                <Button
                  type="submit"
                  className="w-full sm:w-auto"
                  disabled={!title || !slug || !slugOk || tiers.length === 0}>
                  Create event
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
