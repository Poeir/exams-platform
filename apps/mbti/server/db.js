import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { config } from './config.js';
import { buildMssqlConfig } from './dbConfig.js';
import { logger } from './logger.js';

// Single shared Prisma client for the process, backed by the node-mssql driver
// adapter. The adapter is what lets us authenticate to Azure SQL with a managed
// identity in production (DB_AUTH_MODE=managed-identity) — tedious refreshes the
// AAD token itself; SQL auth from DATABASE_URL stays the default for local dev.
//
// The URL still comes from config so the server keeps working off the built-in
// default when no DATABASE_URL env var is set. The adapter owns the connection
// pool; Prisma no longer opens its own.
const mssqlConfig = buildMssqlConfig(config.databaseUrl);
const adapter = new PrismaMssql(mssqlConfig);
export const prisma = new PrismaClient({ adapter });

// Announce at boot how we authenticated to the DB (never the password) so it's
// obvious in logs whether this process is on managed identity or SQL auth.
logger.info('db_connection', {
  server: mssqlConfig.server,
  database: mssqlConfig.database,
  auth: mssqlConfig.authentication ? mssqlConfig.authentication.type : 'sql',
  user: mssqlConfig.user || undefined,
  clientId: mssqlConfig.authentication?.options?.clientId || undefined,
});
