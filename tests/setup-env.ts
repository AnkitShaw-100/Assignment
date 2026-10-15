import { testDatabaseUrl } from "./test-db";

// Must run before the app's Prisma client is imported.
process.env.DATABASE_URL = testDatabaseUrl();
