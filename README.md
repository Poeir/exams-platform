# gofive-exams

ONE container hosting both Gofive assessment engines behind a path-routing
gateway, sharing one SQL Server database:

```
                    :3000 (gateway/index.js)
   /english/*  →  apps/english  — English proficiency test (API + SPA)
   /mbti/*     →  apps/mbti     — MBTI workplace assessment (API + SPA)
   /api/health →  combined health (pings the DB through both engines)
   /           →  landing page
```

Each app keeps its own `package.json`, `node_modules`, and Prisma client.
The apps export their Express `app` (english `server/src/app.js`, mbti
`server/app.js`); the gateway mounts them under the prefixes and is the only
listener. Express strips the mount prefix, so app code never sees `/english`.

## Quick start (local)

```bash
npm run install:all     # root + both apps + english server
cp .env.example .env    # point DATABASE_URL at your SQL Server
npm run build           # builds both SPAs with --base=/english/ and /mbti/
npm start               # gateway on :3000
```

Open http://localhost:3000 — the landing page links to the full english test
(`/english/exam/full`), the 15-min short placement test (`/english/exam/short`),
and the mbti assessment (`/mbti/`). `/english/` remains a working alias for
the full landing.

> **อย่าใช้ `npm --prefix <dir> install`** — npm บน Windows จะยัด root package
> (`"gofive-exams": "file:.."`) เข้าไปใน package.json/lockfile ของแอป แล้ว
> Docker build จะพังด้วย EUSAGE. ใช้ `npm run install:all` หรือ `cd` เข้าไปติดตั้ง.

## Standalone dev (per app, hot reload)

The apps still run exactly as before the merge:

```bash
# english: server :3002 + Vite
cd apps/english/server && npm run dev
cd apps/english && npm run dev

# mbti: server :3001 + Vite :5174
cd apps/mbti && npm run server
cd apps/mbti && npm run dev
```

At base `/` (dev default) every base-path helper (`src/lib/base.js` in both
apps) is a no-op, so standalone behaviour is unchanged.

## Parent-system contract

- One key for both engines: header `X-API-Key` = env `PARENT_API_KEY`.
- english endpoints live under `<host>/english/api/...`,
  mbti under `<host>/mbti/api/v1/...` — see each app's Swagger at
  `/english/api/docs` and `/mbti/api/docs`.
- `PUBLIC_BASE_URL` = the gateway origin browsers see (e.g.
  `https://exam.gofive.co.th`); each engine derives its own URL from it
  (`<base>/english`, `<base>/mbti`) when minting `launchUrl` / view links.
  Per-engine `ENGINE_PUBLIC_URL` / `FRONTEND_URL` remain as overrides.
- Postman collection: `postman-api-for-parent/` at the repo root
  (uses `{{base}}` = the gateway origin). Webhook-receiver reference code
  (HMAC verification in C# and Node.js) lives in `empeo-integration.html`
  section 7.4.

## Database

Shared DB (`gofive_assessments` local / `examo_*` on Azure):
- english owns the migration ledger for the `english` + `shared` schemas
  (`apps/english/server`: `npm run migrate` + `npm run seed`).
- mbti owns the `mbti` schema via SQL scripts only (`apps/mbti/prisma/`:
  mbti-tables.sql → phase2-transfer.sql → merge-results.sql →
  add-webhook-delivery.sql) — **never** run `migrate dev`/`db push` from mbti.
- No auto-migration in the image: apply schema out-of-band before deploying
  against a fresh database.

## Deploy (platformdio)

- Service port `3000`, Dockerfile `Dockerfile`, working dir `.`,
  health checks `/api/health`.
- Required env: `DATABASE_URL` (secret), `PARENT_API_KEY` (secret),
  `PUBLIC_BASE_URL`. Recommended in prod: `VIEW_LINK_SECRET` (secret).
  Optional (english admin): `ADMIN_USERNAME`/`ADMIN_PASSWORD` (secret),
  `CLOUDINARY_*` — unset means the admin UI is disabled.
- `papers_export_1_full.json` is gitignored (answer keys) — seeding happens
  out-of-band from a machine that has it.
