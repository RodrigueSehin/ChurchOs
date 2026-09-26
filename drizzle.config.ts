import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (see .env.local / .env.example)");
}

export default defineConfig({
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // `auth.users` (auth-ref.ts) est géré par Supabase, jamais par nos migrations.
  schemaFilter: ["public"],
  verbose: true,
  strict: true,
});
