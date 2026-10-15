import { execSync } from "node:child_process";
import { Client } from "pg";
import { testDatabaseUrl } from "./test-db";

/** Creates the test database if needed and applies all migrations. */
export default async function setup() {
  const url = new URL(testDatabaseUrl());
  const dbName = url.pathname.slice(1);
  const admin = new URL(url);
  admin.pathname = "/postgres";

  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) {
    await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  }
  await client.end();

  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: url.toString() },
  });
}
