import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// One pool per server. In development, hot reloads would otherwise open a new
// pool on every change.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

// Lets Vercel close idle connections before a function is suspended.
attachDatabasePool(pool);

export const db = drizzle({ client: pool, schema, casing: "snake_case" });
