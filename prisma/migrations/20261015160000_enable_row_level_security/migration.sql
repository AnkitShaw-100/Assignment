-- Supabase exposes the public schema through its Data API (PostgREST) using the
-- public anon key. Enabling RLS with no policies blocks that path entirely; the
-- app connects as the table owner through Prisma, which is not subject to RLS.
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Discussion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
