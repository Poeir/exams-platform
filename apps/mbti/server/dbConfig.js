// Builds the node-mssql connection config consumed by @prisma/adapter-mssql
// (tedious under the hood). Authentication is ALWAYS Azure Entra ID (Managed
// Identity) via DefaultAzureCredential — there is no SQL-password path on the
// runtime wire.
//
// The DB target is configured HERE, directly in code — NOT via env vars and NOT
// via a connection string. (Azure Blob Storage config is a separate system and
// still comes from AZURE_STORAGE_* env.)
//
// mbti applies its schema via the hand-maintained SQL scripts in prisma/ (see
// CLAUDE.md), so there is no Prisma CLI migration step here at all — the runtime
// MI config below is the only way this engine reaches the DB.

const dbSettings = {
  host: 'gofive.database.windows.net', // Azure SQL server FQDN
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
