// Resolved once at boot. Run the server with `node --env-file=.env` (see
// package.json scripts) so .env feeds the runtime too — historically only the
// Prisma CLI read it and these fallbacks silently took over.

// Parent-service shared secret. PARENT_API_KEY is the unified name across both
// assessment engines (english-test uses the same); PARENT_SERVICE_KEY is the
// legacy mbti-only name, kept as a fallback.
const parentApiKey = process.env.PARENT_API_KEY
  || process.env.PARENT_SERVICE_KEY
  || (process.env.NODE_ENV === 'production' ? null : 'dev-parent-key');

// In production a missing DATABASE_URL must fail fast — the localhost
// fallback exists only so local dev works when .env goes missing.
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in production.');
}

export const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL
    || 'sqlserver://localhost:1433;database=gofive_assessments;user=sa;password=Your_password123;encrypt=true;trustServerCertificate=true',
  // Public URL of THIS engine as seen by browsers, used to mint view links.
  // Resolution order: explicit FRONTEND_URL → gateway-wide PUBLIC_BASE_URL +
  // /mbti (the mount prefix) → standalone-dev Vite origin.
  frontendUrl: process.env.FRONTEND_URL
    || (process.env.PUBLIC_BASE_URL && `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/mbti`)
    || 'http://localhost:5174',
  parentApiKey,
  attemptTtlMinutes: Number(process.env.ATTEMPT_TTL_MINUTES || 120),
  // Result view links handed to the parent site (see security.js). The secret
  // defaults to a value derived from the parent key so dev needs no extra env
  // var; set VIEW_LINK_SECRET explicitly in production.
  viewLinkTtlMinutes: Number(process.env.VIEW_LINK_TTL_MINUTES || 15),
  viewLinkSecret: process.env.VIEW_LINK_SECRET || `view-link:${parentApiKey}`,
  // Result webhook push to the parent's callbackUrl (see webhook.js) —
  // mirrors english-test's WEBHOOK_* envs.
  webhookTimeoutMs: Number(process.env.WEBHOOK_TIMEOUT_MS || 8000),
  webhookMaxAttempts: Number(process.env.WEBHOOK_MAX_ATTEMPTS || 5),
  engineVersion: '1.0',
};
