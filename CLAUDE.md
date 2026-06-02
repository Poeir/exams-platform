# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

ONE container hosting both Gofive assessment engines behind a path-routing Express gateway, sharing one SQL Server database:

- `/english/*` → `apps/english` — English proficiency test (API + React SPA)
- `/mbti/*` → `apps/mbti` — MBTI workplace assessment (API + React SPA)
- `/api/health` → combined health (pings the DB through both engines' Prisma clients)
- `/` → landing page

Each app keeps its own `package.json`, `node_modules`, and Prisma client; the two dependency trees coexist in one Node process. Apps export their Express `app` (english: `apps/english/server/src/app.js`, mbti: `apps/mbti/server/app.js`) and never listen themselves — `gateway/index.js` mounts them and is the only listener. Express strips the mount prefix, so app code never sees `/english` or `/mbti`.

Each app has its own `CLAUDE.md` covering frontend internals (`apps/english/CLAUDE.md`, `apps/mbti/CLAUDE.md`) — read the relevant one before working inside an app.

## Commands

```bash
npm run install:all     # root + both apps + english server (run from repo root)
npm run build           # builds both SPAs with --base=/english/ and --base=/mbti/
npm start               # gateway on :3000 (reads .env via --env-file-if-exists)
npm run dev             # gateway with --watch
npm test                # english vitest suite (the only tests in the repo)
```

- **Never use `npm --prefix <dir> install`** — npm on Windows injects the root package (`"gofive-exams": "file:.."`) into the app's package.json/lockfile and the Docker build then fails with EUSAGE. Use `npm run install:all` or `cd` into the directory.
- Single test file: `cd apps/english && npx vitest run server/src/scoring.test.js` (tests live in `apps/english/server/src/*.test.js`).
- Standalone per-app dev (hot reload, unchanged from before the merge): english server `cd apps/english/server && npm run dev` (:3002) + `cd apps/english && npm run dev` (Vite); mbti `cd apps/mbti && npm run server` (:3001) + `npm run dev` (Vite :5174).

## Gateway boot order (gateway/index.js)

The apps are imported **dynamically**, on purpose: importing them inits each Prisma client, which side-loads that app's own `.env` (e.g. `apps/english/server/.env` with standalone-dev values) into `process.env`. The gateway must resolve `PORT` and derive `ENGINE_PUBLIC_URL` / `FRONTEND_URL` from `PUBLIC_BASE_URL` **before** those imports run. Don't convert them to static imports, and don't read env-derived config after the imports.

## Base-path handling

Both SPAs are built with `vite build --base=/<prefix>/`; each app's `src/lib/base.js` exposes `BASE` / `withBase()` / `stripBase()` driven by `import.meta.env.BASE_URL`. At base `/` (dev default) these are no-ops, so standalone dev behaviour is unchanged. Any new frontend code touching URLs, routes, or asset paths must go through these helpers.

## Database (shared, schema ownership split)

One database (`gofive_assessments` local / `examo_*` on Azure), one `DATABASE_URL`:

- **english** owns the migration ledger for the `english` + `shared` schemas: `cd apps/english/server` then `npm run migrate` + `npm run seed`.
- **mbti** owns the `mbti` schema via SQL scripts only (`apps/mbti/prisma/`: mbti-tables.sql → phase2-transfer.sql → merge-results.sql → add-webhook-delivery.sql). **Never run `prisma migrate dev` / `db push` from mbti** — its Prisma schema is introspection-style, not the source of truth for DDL.
- No auto-migration in the Docker image — schema is applied out-of-band before deploying against a fresh database.

## Parent-system contract

- One key for both engines: header `X-API-Key` = env `PARENT_API_KEY` (legacy `x-service-key` / `PARENT_SERVICE_KEY` aliases were removed).
- **Unified camelCase contract**: every parent-facing field on BOTH engines is camelCase (`attemptId`, `externalUserId`, `callbackUrl`, `launchUrl`, `viewUrl`, `completedAt`, ...), terminal status on the wire is `completed`, webhooks share one envelope (+ `engineVersion`), view links use `?view_token=`. english is snake_case *internally* (DB + candidate/admin endpoints) and maps at the parent boundary via `toParentAttempt()` / `parentStatus()` in `apps/english/server/src/routes/attempts.js` — don't leak snake_case into parent responses. The empeo-facing doc is `empeo-integration.html` at the repo root; keep it in sync with contract changes.
- english endpoints: `<host>/english/api/...`; mbti: `<host>/mbti/api/v1/...`. Swagger at `/english/api/docs` and `/mbti/api/docs`.
- `PUBLIC_BASE_URL` = the gateway origin browsers see; each engine derives its own public URL (`<base>/english`, `<base>/mbti`) when minting `launchUrl` / view links. Per-engine `ENGINE_PUBLIC_URL` / `FRONTEND_URL` are overrides.
- Postman collection + webhook listener live in `mock-parent/` at the repo root (moved in from the old sibling folder). Keep the collection in sync with contract changes — its Get Papers script classifies the full vs short english paper by name (same rule as `paperVariant()`).

## Environment & deploy

- `.env.example` documents all vars; required: `DATABASE_URL`, `PARENT_API_KEY`, `PUBLIC_BASE_URL`. Unset `ADMIN_USERNAME`/`ADMIN_PASSWORD` means the english admin UI is disabled (503). `VIEW_LINK_SECRET` defaults to deriving from `PARENT_API_KEY` — set explicitly in prod.
- Deployed on platformdio: port 3000, health check `/api/health`.
- `papers_export_1_full.json` (english exam content + answer keys) is **gitignored** — seeding happens out-of-band from a machine that has it; the Docker build deliberately excludes it.
