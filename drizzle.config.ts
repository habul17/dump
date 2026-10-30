import { loadEnvFile } from "node:process";
import { defineConfig } from "drizzle-kit";

// .env.local points at the testing database. ENV_FILE=.env.live points at the
// live one (see the db:migrate:live script).
loadEnvFile(process.env.ENV_FILE ?? ".env.local");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
