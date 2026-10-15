import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrate, db seed) prefers DIRECT_URL: on Supabase that is the
// session-mode pooler, since migrations need a session-level connection. The
// app itself connects with DATABASE_URL (see src/lib/server/db.ts).
const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL (see .env.example)");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url },
});
