import { testDatabaseUrl } from "./test-db";

// Must run before the app's Prisma client is imported.
process.env.DATABASE_URL = testDatabaseUrl();
process.env.DIRECT_URL = process.env.DATABASE_URL;
