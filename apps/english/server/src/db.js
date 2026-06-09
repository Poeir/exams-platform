import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import 'dotenv/config';
import { log } from './logger.js';
import { buildMssqlConfig } from './dbConfig.js';

// Single shared Prisma Client for the whole server, backed by the node-mssql
// driver adapter. The adapter (not Prisma's built-in Rust connector) is what
// lets us authenticate to Azure SQL with a managed identity in production
// (DB_AUTH_MODE=managed-identity) — tedious refreshes the AAD token itself.
// SQL auth from DATABASE_URL stays the default for local dev. The adapter owns
// the connection pool; Prisma no longer opens its own.
const mssqlConfig = buildMssqlConfig();
const adapter = new PrismaMssql(mssqlConfig);
export const prisma = new PrismaClient({ adapter });

// Announce at boot how we authenticated to the DB (never the password) so it's
// obvious in logs whether this process is on managed identity or SQL auth.
log.info('db_connection', {
  server: mssqlConfig.server,
  database: mssqlConfig.database,
  auth: mssqlConfig.authentication ? mssqlConfig.authentication.type : 'sql',
  user: mssqlConfig.user || undefined,
  clientId: mssqlConfig.authentication?.options?.clientId || undefined,
});

// Surface query-engine errors through the same structured logger the rest of
// the app uses.
prisma.$on?.('error', (e) => {
  log.error('db_error', { message: e.message, target: e.target });
});

// SIGINT/SIGTERM shutdown is orchestrated in index.js (close the HTTP server
// first, then disconnect). beforeExit covers one-off scripts (seed, etc.).
process.once('beforeExit', () => prisma.$disconnect());
