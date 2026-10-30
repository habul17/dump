import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
};

// ---------- Sign-in (tables Better Auth expects) ----------

export const user = pgTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull().unique(),
  emailVerified: boolean().default(false).notNull(),
  image: text(),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...timestamps,
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text().primaryKey(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.identifier)],
);

export const rateLimit = pgTable("rate_limit", {
  id: text().primaryKey(),
  key: text().notNull().unique(),
  count: integer().notNull(),
  lastRequest: bigint({ mode: "number" }).notNull(),
});

// ---------- Ideas ----------

export const ideaStatus = pgEnum("idea_status", [
  "queued",
  "building",
  "done",
  "archived",
]);

export const ideas = pgTable(
  "ideas",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text().notNull(),
    description: text().default("").notNull(),
    techStack: text().array().default(sql`'{}'::text[]`).notNull(),
    tags: text().array().default(sql`'{}'::text[]`).notNull(),
    repoUrl: text(),
    liveUrl: text(),
    status: ideaStatus().default("queued").notNull(),
    // Order inside Up next. Lower comes first.
    position: integer().default(0).notNull(),
    startedAt: timestamp({ withTimezone: true }),
    finishedAt: timestamp({ withTimezone: true }),
    archivedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index().on(t.userId, t.status, t.position),
    // Only one project can be in Now building at a time.
    uniqueIndex("ideas_one_building")
      .on(t.userId)
      .where(sql`${t.status} = 'building'`),
  ],
);

export const steps = pgTable(
  "steps",
  {
    id: uuid().primaryKey().defaultRandom(),
    ideaId: uuid()
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    text: text().notNull(),
    done: boolean().default(false).notNull(),
    position: integer().default(0).notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index().on(t.ideaId, t.position)],
);

export const logEntries = pgTable(
  "log_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    ideaId: uuid()
      .notNull()
      .references(() => ideas.id, { onDelete: "cascade" }),
    body: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index().on(t.ideaId, t.createdAt)],
);
