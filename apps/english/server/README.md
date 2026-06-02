# english-test backend

Express + Prisma (SQL Server / Azure SQL) backend for the exam engine + content
admin. Shares one database (`gofive_assessments`) with the mbti
service (`apps/mbti`) — see `../docs/unified-db-plan.md` for the
schema-ownership model.

## Quick start

```bash
# 1. Start SQL Server (the shared container lives in the mbti app)
docker compose -f ../../mbti/docker-compose.yml up -d

# 2. Install deps (postinstall runs `prisma generate`)
npm install
cp .env.example .env        # DATABASE_URL points at localhost:1433 / gofive_assessments

# 3. Apply the schema (this repo owns the `english` + `shared` schemas)
npm run migrate          # prisma migrate deploy

# 4. Seed exam content
npm run seed

# 5. Start API (port 3002 — mbti owns 3001)
npm run dev
```

Then in the React app root: `npm run dev` (Vite proxies `/api/*` here).

## Data layer

- **Schema** lives in `prisma/schema.prisma` (multiSchema: `english` + `shared`);
  the SQL it compiles to is in `prisma/migrations/`.
  The `CHECK (status IN ...)` constraint, the filtered
  `idx_attempts_undelivered` index, and the filtered unique index on
  `launch_token` can't be expressed in the schema language, so they're
  hand-maintained in migration SQL (`20260602050000_drop_user_ref_fold_constraints`)
  — keep them in sync when changing those columns.
- **Query layer** is Prisma Client (`src/db.js` exports a shared `prisma`).
  JSON columns are `NVARCHAR(MAX)` strings — serialise via `src/json.js`.
- **Scripts**: `npm run migrate` (deploy), `npm run migrate:dev` (author a new
  migration in dev), `npm run generate`, `npm run studio`, `npm run seed`.

### Shared-database rules

- This app owns the migration ledger for the `english` AND `shared` schemas.
- The mbti service only *declares* `shared.subjects` and must never run
  `migrate dev`/`db push` against the shared database (it applies its own
  `mbti` schema changes via hand-maintained SQL scripts in
  `../../mbti/prisma/`: mbti-tables.sql → phase2-transfer.sql →
  merge-results.sql → add-webhook-delivery.sql).
- `shared.subjects` column shapes must stay in lockstep with
  `../../mbti/prisma/schema.prisma`.
