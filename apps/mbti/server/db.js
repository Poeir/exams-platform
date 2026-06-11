import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { buildMssqlConfig } from './dbConfig.js';
import { logger } from './logger.js';

// Single shared Prisma client for the process, backed by the node-mssql driver
// adapter. The adapter authenticates to Azure SQL with a managed identity —
// tedious refreshes the AAD token itself. The DB target is configured directly
// in code (see dbConfig.js); there is no DATABASE_URL on the runtime wire. The
// adapter owns the connection pool; Prisma no longer opens its own.
const mssqlConfig = buildMssqlConfig();
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
