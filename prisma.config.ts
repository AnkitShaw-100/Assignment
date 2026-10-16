import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrate, db seed) prefers DIRECT_URL: on Supabase that is the
// session-mode pooler, since migrations need a session-level connection. The
// app itself connects with DATABASE_URL (see src/lib/server/db.ts).
// No URL is required for `prisma generate`, which runs on install (e.g. in CI or
// on Vercel); commands that need a database report a missing URL themselves.
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  ...(url ? { datasource: { url } } : {}),
});
