import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { log } from './logger.js';

// Single shared Prisma Client for the whole server. Prisma manages its own
// connection pool internally, so there's no explicit pool to wire up here.
export const prisma = new PrismaClient();

// Surface query-engine errors through the same structured logger the rest of
// the app uses.
prisma.$on?.('error', (e) => {
  log.error('db_error', { message: e.message, target: e.target });
});

// SIGINT/SIGTERM shutdown is orchestrated in index.js (close the HTTP server
// first, then disconnect). beforeExit covers one-off scripts (seed, etc.).
process.once('beforeExit', () => prisma.$disconnect());
