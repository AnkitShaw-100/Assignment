import "dotenv/config";

/**
 * Tests run against a separate database so they never touch development data.
 * Uses TEST_DATABASE_URL, or derives "<db>_test" from DATABASE_URL.
 */
export function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) throw new Error("Set DATABASE_URL or TEST_DATABASE_URL to run tests");
  const url = new URL(base);
  url.pathname = `${url.pathname.replace(/\/$/, "")}_test`;
  return url.toString();
}
