// Builds the node-mssql connection config consumed by @prisma/adapter-mssql
// (tedious under the hood) from the Prisma-style DATABASE_URL, choosing the
// authentication method by DB_AUTH_MODE:
//
//   'sql' (default)          — username/password taken from DATABASE_URL.
//                              Local dev and the old behaviour, unchanged.
//   'managed-identity'/'aad' — Azure Entra ID via DefaultAzureCredential, no
//                              secret on the wire. On Azure App Service this is
//                              the resource's managed identity; set
//                              AZURE_SQL_CLIENT_ID to pin a *user-assigned*
//                              identity (omit it for system-assigned).
//
// DATABASE_URL stays the single source of host/port/database and is still what
// the Prisma CLI (migrate/seed/studio) reads — only the *runtime* connection
// swaps to managed identity. So migrations keep using SQL auth out-of-band
// while the running server authenticates with no password.

// Parse `sqlserver://host:port;key=value;key=value` (Prisma's semicolon-style
// SQL Server URL — not a standard query string, so URL() can't be used).
export function parseSqlServerUrl(url) {
  if (!url) throw new Error('DATABASE_URL is not set');
  const withoutScheme = url.replace(/^sqlserver:\/\//i, '');
  const [hostPort, ...pairs] = withoutScheme.split(';');
  const [server, port] = hostPort.split(':');
  const params = {};
  for (const pair of pairs) {
    if (!pair) continue;
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    params[pair.slice(0, idx).trim().toLowerCase()] = pair.slice(idx + 1).trim();
  }
  return { server, port: port ? Number(port) : 1433, params };
}

export function buildMssqlConfig(url = process.env.DATABASE_URL, env = process.env) {
  const { server, port, params } = parseSqlServerUrl(url);
  const authMode = (env.DB_AUTH_MODE || 'sql').toLowerCase();

  const config = {
    server,
    port,
    database: params.database,
    options: {
      // Azure SQL requires TLS; the URL's flags win so local dev with a
      // self-signed cert (trustServerCertificate=true) keeps working.
      encrypt: params.encrypt ? params.encrypt !== 'false' : true,
      trustServerCertificate: params.trustservercertificate === 'true',
    },
  };

  if (authMode === 'managed-identity' || authMode === 'aad') {
    config.authentication = {
      type: 'azure-active-directory-default',
      // clientId selects a user-assigned managed identity; absent => the
      // DefaultAzureCredential chain (system-assigned MI, az login, etc.).
      options: env.AZURE_SQL_CLIENT_ID ? { clientId: env.AZURE_SQL_CLIENT_ID } : {},
    };
    return config;
  }

  // Default: SQL authentication from the connection string.
  config.user = params.user;
  config.password = params.password;
  return config;
}
