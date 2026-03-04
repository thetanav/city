import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { EventStatus, PrismaClient } from "../generated/prisma/client";

type Args = {
  users: number;
  events: number;
  tickets: number;
  reset: boolean;
};

type PriceTier = {
  id: string;
  name: string;
  price: number;
  seats: number;
  note?: string;
};

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Riley",
  "Sam",
  "Avery",
  "Casey",
  "Morgan",
  "Skyler",
  "Quinn",
  "Jamie",
  "Dakota",
];

const LAST_NAMES = [
  "Reed",
  "Carter",
  "Hayes",
  "Parker",
  "Brooks",
  "Diaz",
  "Kim",
  "Patel",
  "Lopez",
  "Foster",
  "Turner",
  "Morris",
];

const CITIES = [
  { city: "New York", venue: "Pier 36" },
  { city: "Los Angeles", venue: "Sunset Hall" },
  { city: "Chicago", venue: "Navy Yard Stage" },
  { city: "Austin", venue: "Warehouse District Arena" },
  { city: "Seattle", venue: "Harbor Lights Center" },
  { city: "Miami", venue: "South Beach Dome" },
  { city: "Denver", venue: "Mile High Hall" },
  { city: "San Francisco", venue: "Mission Square" },
  { city: "Boston", venue: "Fenway Pavilion" },
  { city: "Nashville", venue: "Broadway Yard" },
];

const EVENT_THEMES = [
  { title: "Neon Nights", genre: ["Electronic", "Dance"] },
  { title: "Indie Revival", genre: ["Indie", "Alternative"] },
  { title: "City Jazz Sessions", genre: ["Jazz", "Live"] },
  { title: "Afrobeats Pulse", genre: ["Afrobeats", "World"] },
  { title: "Retro Pop Arena", genre: ["Pop", "Throwback"] },
  { title: "Underground Techno", genre: ["Techno", "Rave"] },
  { title: "Acoustic Stories", genre: ["Acoustic", "Singer-Songwriter"] },
  { title: "Hip Hop Blockparty", genre: ["Hip-Hop", "Rap"] },
  { title: "Lo-fi Rooftop", genre: ["Lo-fi", "Chill"] },
  { title: "Latin Heat Live", genre: ["Latin", "Dance"] },
];

function parseArgs(argv: string[]): Args {
  const args: Args = {
    users: 18,
    events: 36,
    tickets: 420,
    reset: argv.includes("--reset"),
  };

  for (const arg of argv) {
    if (arg.startsWith("--users=")) {
      args.users = toPositiveInt(arg.split("=")[1], args.users);
    }
    if (arg.startsWith("--events=")) {
      args.events = toPositiveInt(arg.split("=")[1], args.events);
    }
    if (arg.startsWith("--tickets=")) {
      args.tickets = toPositiveInt(arg.split("=")[1], args.tickets);
    }
  }

  return args;
}

function toPositiveInt(raw: string | undefined, fallback: number) {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : fallback;
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(list: T[]) {
  return list[randomInt(0, list.length - 1)];
}

function makeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function buildPoster(seed: string) {
  const encoded = encodeURIComponent(seed);
  return `https://picsum.photos/seed/${encoded}/1280/720`;
}

function shiftDate(daysFromNowMin: number, daysFromNowMax: number) {
  const now = Date.now();
  const dayMs = 86_400_000;
  return new Date(now + randomInt(daysFromNowMin, daysFromNowMax) * dayMs);
}

function statusFromDate(startDate: Date): EventStatus {
  const now = Date.now();
  const diffDays = (startDate.getTime() - now) / 86_400_000;

  if (diffDays < -1) return EventStatus.STOPPED;
  if (diffDays > 120) return EventStatus.DRAFT;
  return Math.random() < 0.82 ? EventStatus.LIVE : EventStatus.DRAFT;
}

function buildTiers(basePrice: number): PriceTier[] {
  const hasVip = Math.random() > 0.3;
  const hasBackstage = Math.random() > 0.68;

  const generalSeats = randomInt(60, 260);
  const tiers: PriceTier[] = [
    {
      id: "general",
      name: "General",
      price: basePrice,
      seats: generalSeats,
    },
  ];

  if (hasVip) {
    tiers.push({
      id: "vip",
      name: "VIP",
      price: Math.round(basePrice * 1.8),
      seats: randomInt(20, 90),
      note: "Priority entry",
    });
  }

  if (hasBackstage) {
    tiers.push({
      id: "backstage",
      name: "Backstage",
      price: Math.round(basePrice * 3.2),
      seats: randomInt(8, 26),
      note: "Artist meet-and-greet",
    });
  }

  return tiers;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is missing in environment.");
  }

  const config = parseArgs(process.argv.slice(2));

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const runTag = `ui-seed-${Date.now()}`;
  const dummyDomain = "ui-seed.local";

  try {
    if (config.reset) {
      await prisma.$transaction([
        prisma.ticket.deleteMany({}),
        prisma.event.deleteMany({}),
        prisma.session.deleteMany({}),
        prisma.account.deleteMany({}),
        prisma.verification.deleteMany({}),
        prisma.user.deleteMany({ where: { email: { contains: `@${dummyDomain}` } } }),
      ]);
      console.log("Reset complete.");
    }

    const users = [] as { id: string; email: string; name: string }[];
    for (let i = 0; i < config.users; i++) {
      const first = pickOne(FIRST_NAMES);
      const last = pickOne(LAST_NAMES);
      const user = await prisma.user.create({
        data: {
          name: `${first} ${last}`,
          email: `${first.toLowerCase()}.${last.toLowerCase()}.${runTag}.${i}@${dummyDomain}`,
          emailVerified: Math.random() > 0.08,
          image: `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(`${first}-${last}-${i}`)}`,
          stripeCustomerId: Math.random() > 0.5 ? `cus_${runTag}_${i}` : null,
        },
        select: { id: true, email: true, name: true },
      });

      users.push(user);

      await prisma.account.create({
        data: {
          accountId: `acct-${runTag}-${i}`,
          providerId: Math.random() > 0.3 ? "google" : "credential",
          userId: user.id,
          accessToken: `at_${runTag}_${i}`,
          refreshToken: `rt_${runTag}_${i}`,
          scope: "openid email profile",
          password: Math.random() > 0.3 ? `hashed_dummy_${runTag}_${i}` : null,
        },
      });

      if (Math.random() > 0.2) {
        await prisma.session.create({
          data: {
            token: `st_${runTag}_${i}`,
            userId: user.id,
            expiresAt: shiftDate(20, 120),
            ipAddress: `10.0.${randomInt(0, 255)}.${randomInt(1, 255)}`,
            userAgent: "Mozilla/5.0 (Dummy Seed)",
          },
        });
      }

      if (Math.random() > 0.5) {
        await prisma.verification.create({
          data: {
            identifier: user.email,
            value: `verify_${runTag}_${i}`,
            expiresAt: shiftDate(1, 20),
          },
        });
      }
    }

    const events = [] as { id: string; prices: PriceTier[]; status: EventStatus }[];
    for (let i = 0; i < config.events; i++) {
      const creator = pickOne(users);
      const cityVenue = pickOne(CITIES);
      const theme = pickOne(EVENT_THEMES);
      const startDate = shiftDate(-25, 130);
      const endDate = new Date(startDate.getTime() + randomInt(2, 6) * 3_600_000);
      const status = statusFromDate(startDate);
      const tiers = buildTiers(randomInt(18, 95));
      const totalTickets = tiers.reduce((sum, tier) => sum + tier.seats, 0);

      const event = await prisma.event.create({
        data: {
          title: `${theme.title} ${2026 + (i % 2)}`,
          tagline: `Live in ${cityVenue.city}`,
          description:
            "A high-energy event crafted for UI testing, with varied tiers and realistic attendance flow.",
          slug: `${makeSlug(`${theme.title}-${cityVenue.city}-${runTag}-${i}`)}-${i}`,
          startDate,
          endDate,
          location: cityVenue.venue,
          city: cityVenue.city,
          contactEmail: `events+${i}@${dummyDomain}`,
          posterImage: Math.random() > 0.1 ? buildPoster(`${runTag}-${i}`) : null,
          prices: tiers,
          totalTickets,
          genre: theme.genre,
          creatorId: creator.id,
          status,
        },
        select: { id: true, prices: true, status: true },
      });

      events.push({
        id: event.id,
        prices: (Array.isArray(event.prices) ? event.prices : []) as PriceTier[],
        status: event.status,
      });
    }

    let ticketCount = 0;
    for (let i = 0; i < config.tickets; i++) {
      const event = pickOne(events);
      const buyer = Math.random() > 0.18 ? pickOne(users) : null;
      const availableTiers = event.prices.filter(
        (tier) => typeof tier?.name === "string" && typeof tier?.price === "number",
      );

      if (availableTiers.length === 0) continue;

      const tier = pickOne(availableTiers);
      const qty = randomInt(1, 4);
      const shouldInvalidate = event.status === EventStatus.STOPPED && Math.random() > 0.65;

      await prisma.ticket.create({
        data: {
          tierName: tier.name,
          qty,
          unitPrice: Number(tier.price),
          paymentId: Math.random() > 0.25 ? `pi_${runTag}_${i}` : null,
          eventId: event.id,
          userId: buyer?.id ?? null,
          valid: !shouldInvalidate,
          createdAt: shiftDate(-40, 1),
        },
      });

      ticketCount += 1;
    }

    console.log(`Dummy data created.`);
    console.log(`Users: ${users.length}`);
    console.log(`Events: ${events.length}`);
    console.log(`Tickets: ${ticketCount}`);
    console.log(`Tag: ${runTag}`);
    console.log(`Run with --reset to clear previous seed data first.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
