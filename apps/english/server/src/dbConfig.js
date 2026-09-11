// Builds the node-mssql connection config consumed by @prisma/adapter-mssql
// (tedious under the hood). Authentication is ALWAYS Azure Entra ID (Managed
// Identity) via DefaultAzureCredential — there is no SQL-password path on the
// runtime wire.
//
// The DB target is configured HERE, directly in code — NOT via env vars and NOT
// via a connection string. (Azure Blob Storage config is a separate system and
// still comes from AZURE_STORAGE_* env, see azureStorage.js.)
//
// The Prisma CLI (migrate/seed/studio) is a SEPARATE, out-of-band concern: it
// still reads DATABASE_URL from schema.prisma when an operator runs migrations
// against the DB. That value is NOT read at runtime and is NOT a deploy secret —
// the running server connects only through this MI config + the driver adapter.

const dbSettings = {
  host: 'your-sql-server.database.windows.net', // Azure SQL server FQDN (redacted for portfolio copy)
  port: 1433,
  database: process.env.DB_DATABASE || 'examo_dev', // the only env-driven DB field
  encrypt: true, // required by Azure SQL
  trustServerCertificate: false,
  // DefaultAzureCredential: managed identity in Azure, az-login locally.
  // Set only for a USER-assigned managed identity; '' = system-assigned.
  managedIdentityClientId: '',
};

export function buildMssqlConfig() {
  return {
    server: dbSettings.host,
    port: dbSettings.port,
    database: dbSettings.database,
    options: {
      encrypt: dbSettings.encrypt,
      trustServerCertificate: dbSettings.trustServerCertificate,
    },
    authentication: {
      type: 'azure-active-directory-default',
      options: dbSettings.managedIdentityClientId
        ? { clientId: dbSettings.managedIdentityClientId }
        : {},
    },
  };
}
