import "dotenv/config";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "db"]);

/**
 * Tests wipe their database, so they never run against DATABASE_URL itself.
 * Uses TEST_DATABASE_URL, or — only for a local DATABASE_URL — derives "<db>_test".
 * A remote (e.g. Supabase) DATABASE_URL requires an explicit TEST_DATABASE_URL.
 */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("Set TEST_DATABASE_URL to run tests");
  const url = new URL(base);
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `DATABASE_URL points at ${url.hostname}; set TEST_DATABASE_URL to a disposable local database (tests delete all rows).`,
    );
  }
  url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
  return url.toString();
}
