import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const eventStatusEnum = pgEnum("EventStatus", ["DRAFT", "LIVE", "STOPPED"]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    emailVerified: boolean("emailVerified").notNull().default(false),
    image: text("image"),
    stripeCustomerId: text("stripeCustomerId"),
    createdAt: timestamp("createdAt", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false }).notNull(),
  },
  (table) => [uniqueIndex("user_email_key").on(table.email)],
);

export const event = pgTable(
  "event",
  {
    id: text("id").primaryKey(),
    posterImage: text("posterImage"),
    title: text("title").notNull(),
    tagline: text("tagline"),
    description: text("description").notNull(),
    slug: text("slug").notNull(),
    startDate: timestamp("startDate", { withTimezone: false }).notNull(),
    endDate: timestamp("endDate", { withTimezone: false }).notNull(),
    location: text("location").notNull(),
    city: text("city"),
    contactEmail: text("contactEmail"),
    prices: jsonb("prices"),
    totalTickets: integer("totalTickets").notNull(),
    bookedTickets: integer("bookedTickets").notNull().default(0),
    genre: text("genre")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    creatorId: text("creatorId"),
    createdAt: timestamp("createdAt", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false }).notNull(),
    status: eventStatusEnum("status").notNull().default("DRAFT"),
  },
  (table) => [
    uniqueIndex("event_slug_key").on(table.slug),
    index("event_startDate_idx").on(table.startDate),
    index("event_creatorId_idx").on(table.creatorId),
  ],
);

export const ticket = pgTable(
  "ticket",
  {
    id: text("id").primaryKey(),
    tierName: text("tierName").notNull(),
    qty: integer("qty").notNull().default(1),
    unitPrice: integer("unitPrice").notNull(),
    paymentId: text("paymentId"),
    eventId: text("eventId")
      .notNull()
      .references(() => event.id, { onDelete: "cascade" }),
    userId: text("userId").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false }).notNull(),
    valid: boolean("valid").notNull().default(true),
  },
  (table) => [
    index("ticket_userId_idx").on(table.userId),
    index("ticket_eventId_idx").on(table.eventId),
    index("ticket_paymentId_idx").on(table.paymentId),
  ],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { withTimezone: false }).notNull(),
    token: text("token").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("session_token_key").on(table.token),
    index("session_userId_idx").on(table.userId),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: false,
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: false,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false }).notNull(),
  },
  (table) => [
    uniqueIndex("account_providerId_accountId_key").on(table.providerId, table.accountId),
    index("account_userId_idx").on(table.userId),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: false }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: false }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: false }).notNull(),
  },
  (table) => [
    uniqueIndex("verification_identifier_value_key").on(table.identifier, table.value),
    index("verification_identifier_idx").on(table.identifier),
  ],
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  tickets: many(ticket),
  events: many(event, { relationName: "EventCreator" }),
}));

export const eventRelations = relations(event, ({ one, many }) => ({
  creator: one(user, {
    fields: [event.creatorId],
    references: [user.id],
    relationName: "EventCreator",
  }),
  tickets: many(ticket),
}));

export const ticketRelations = relations(ticket, ({ one }) => ({
  event: one(event, {
    fields: [ticket.eventId],
    references: [event.id],
  }),
  user: one(user, {
    fields: [ticket.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
