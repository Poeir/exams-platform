import { PrismaClient } from '@prisma/client';
import { config } from './config.js';

// Single shared Prisma client for the process. Prisma manages its own
// connection pool internally, so there is no separate Pool to configure.
//
// The URL is passed explicitly from config so the server keeps working off the
// built-in default when no DATABASE_URL env var is set (the Express server does
// not load .env). The Prisma CLI (migrate/generate) reads DATABASE_URL from
// .env separately.
export const prisma = new PrismaClient({
  datasourceUrl: config.databaseUrl,
});
