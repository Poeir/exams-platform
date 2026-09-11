# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This app normally runs mounted at `/mbti` behind the repo-root gateway — see the root `CLAUDE.md` for the gateway, shared-database, and parent-contract rules. This file covers the app's internals.

## Commands

- `npm run dev` — Vite dev server on port 5174 (opens browser; proxies `/api` → :3001)
- `npm run server` — Express API with `--watch` on :3001 (`server/index.js`; reads `.env` via `--env-file-if-exists`)
- `npm run server:start` — API without watch
- `npm run build` — production build to `dist/` (the gateway builds with `--base=/mbti/`)
- `npm run preview` — preview the built output
- `npm run api:smoke` — end-to-end smoke test against the running API
- `npm run db:generate` / `db:studio` — Prisma client codegen / Studio

**Never run `npm run db:migrate` / `db:migrate:dev` against the shared database** — the `mbti` schema is applied via the hand-maintained SQL scripts in `prisma/` (mbti-tables.sql → phase2-transfer.sql → merge-results.sql → add-webhook-delivery.sql); `prisma/schema.prisma` is introspection-style, not the DDL source of truth. The english app owns the migration ledger for the `english` + `shared` schemas.

There is no test suite, linter, or type-checker configured.

## Origin and reference material

This project was bootstrapped from a Claude Design handoff bundle. The original prototype lives in `handoff/mbti/project/` (gitignored) as React-via-Babel HTML files — treat it as the visual reference, not source. Re-downloadable from `https://api.anthropic.com/v1/design/h/IYwHQVMhzL1wUDmG4KVOmw`. The chat transcript in `handoff/mbti/chats/chat1.md` captures the design intent.

## Architecture

Single-page React app with **in-memory screen routing** (no router library), backed by an Express + Prisma (SQL Server / Azure SQL) API in `server/`. `src/App.jsx` holds the global state — `screen`, `answers`, `activeAttempt`, `resultRecord`, `resultCodeOverride` (dev-only) — and conditionally renders one screen component. Screens advance by calling callbacks (`onComplete`, `onBack`) that mutate `screen`.

**Flow:** `landing → purpose → quiz → loading-result → result`

(The Compare screen from the original prototype was removed — there is no `Compare.jsx` / `compareFit.js`.)

`src/components.jsx` contains all shared UI: `Mascot`, buttons, icons, `ProgressDots`, `Toast`, and `Loading` (animated ring). A `DevPanel` exists in `App.jsx` for dev-only screen/type jumping, mock-vs-service mode switching, and fake users (Alice/Bob); it is excluded from production builds.

### Parent integration (`src/lib/assessmentApi.js` + `mockParentApi.js`)

Two persistence modes, switchable in the DevPanel: **Browser mock** (`mockParentApi.js`, localStorage) and **service** (`assessmentApi.js` → the Express API). Launch context arrives via URL params: `?attempt_id=…&attempt_token=…` (parent-launched attempt; the token is stripped from the URL immediately and kept in sessionStorage), `?view_token=…` (read-only result view), `?result_id=…`. Result shaping/serialization lives in `src/lib/resultContract.js`, `resultCatalog.js`, `resultExport.js`.

### Base-path handling (`src/lib/base.js`)

`BASE` / `withBase()` driven by `import.meta.env.BASE_URL` (`''` standalone, `/mbti` behind the gateway). Mascot PNGs in `public/mascots/` are referenced through `withBase('/mascots/name.png')` in `components.jsx` — any new asset/URL code must use the helper.

### Quiz engine (`src/screens/Quiz.jsx` + `src/lib/quizPath.js` + `src/data.js`)

The quiz path is **computed, not stored**. `buildPath(answers)` in `src/lib/quizPath.js` walks `LINEAR_ORDER` (18 questions per run) and, when it reaches the `q9-stress` slot, swaps in the branch question whose id is stored on the previous answer's `next` field (set by Q8's selected option — `q9-stress` or `q9-team`). The selected option also carries hidden MBTI weights in `w` (e.g. `{ T: 1, J: 1 }`).

Three question formats coexist on the same `Quiz` component:
- `mcq` — single-select; answer is `{ optionId, w, next? }`
- `chat` — bubbles reveal on a timer, then reply options; answer is `{ optionId, w }`
- `slider` — distribute 100 points across N actions via an interactive donut picker; answer is `{ distribution, options }`. Only commits when total equals exactly 100.

**Mutating Q8's branching also requires updating `buildPath`'s linear order if you add more branched questions.**

### Scoring (`src/lib/scoring.js`)

`scoreAnswers(answers)` walks every answer's `w` (or for sliders: `(distribution[actionId] / 100) * 2 * option.w`) and accumulates signed sums across four axes (`E/I`, `S/N`, `T/F`, `J/P`). Sign picks the letter; magnitude divided by total weight produces the percent shown on trait bars. The slider multiplier of `×2` keeps slider answers comparable in influence to mcq answers.

Secondary **facets** (16 labels in `FACET_LABELS`: `initiating`, `deepFocus`, `concrete`, `empathetic`, etc.) accumulate separately and produce a richer interpretation layer. Axis scores also yield **confidence levels**: `midzone` (<55%), `slight` (55–65%), `clear` (65–80%), `veryClear` (80%+), which flag near-50/50 axes as "both styles possible."

The backend **re-scores from raw `responses`** on complete — it never trusts the browser's result.

### Interactive donut slider (`src/lib/donutMath.js`)

Pure math for the slider UI. Key functions:
- `evenDistribution(actions)` — 25% per segment, remainder on last
- `moveBoundary(dist, ids, handleIdx, newPos)` — constrains drag between neighbours (±2% minimum per segment), maintains the invariant that all values sum to exactly 100
- `pointerAngleFraction(event, svgRef)` — converts pointer event to 0..1 circle fraction

### Data (`src/data.js`)

Two top-level exports:
- **`SCENARIOS`** — 19 question objects (q1–q18 plus the two q9 branch variants; 18 are asked per run). Each option/action carries `w` (axis weights), `facets`, `evidence`, `risk`, `rationale`, and optionally `next` (branch target for Q8). Each scenario has an `assessment` block with `discrimination` (1.0–1.2 multiplier) and `difficulty`.
- **`TYPES`** — 16 MBTI type objects. Each has `code`, Thai/English role labels, `tagline`, `summary`, `strengths`, `comm`, `decision`, `feedback`, `blindspots`, `growthTips`, `workWithMe`, and `reminder`.

## Backend (`server/`)

Express app built in `server/app.js` (exported, never listens — the gateway mounts it; `server/index.js` is the standalone entrypoint, :3001). Config resolved once at boot in `server/config.js` (`PARENT_API_KEY`, `FRONTEND_URL` / `PUBLIC_BASE_URL` + `/mbti`, TTLs, `WEBHOOK_*`, `engineVersion`). Business logic in `assessmentService.js`; opaque attempt tokens are hashed + constant-time compared in `security.js`; result webhooks (HMAC `X-Signature`, unified envelope with the english engine) in `webhook.js`.

API (`/api/v1/...`, unified camelCase contract, terminal status `completed`):
- `POST /api/v1/assessment-attempts` (X-API-Key) — create attempt, returns `attemptToken` + `launchUrl`
- `POST /api/v1/assessment-attempts/:attemptId/complete` (Bearer attempt token) — submit responses; server re-scores
- `POST /api/v1/assessment-attempts/:attemptId/redeliver` / `…/view-link` (X-API-Key)
- `GET /api/v1/assessment-results/view?view_token=…` / `GET /api/v1/assessment-results/:resultId` (Bearer)
- `GET|POST /api/v1/subjects/:sourceSystem/:externalUserId/results|view-link` (X-API-Key)

OpenAPI spec lives in `docs/openapi.yaml`, served at `/api/docs` (UI) + `/api/docs.json` — keep it in sync with route changes. Storage: `shared.subjects` (declared here, migration ledger owned by english) + `mbti.attempts` (the former results table was folded into it by merge-results.sql; webhook-delivery columns added by add-webhook-delivery.sql). See `docs/integration-contract.md` and `README.md` for setup.

## Styling

`src/styles/app.css` imports `colors_and_type.css` (brand design tokens — `--color-*`, `--font-sans`, etc.) and adds all layout/screen-specific rules. The brand override at the top of `app.css` reuses the **Venio token name `--color-bluetiful` to hold empeo orange `#F05B2F`** — do not rename without sweeping the file. Four custom brand font weights (Text=400, Medium=500, Semi-Bold=600, Bold=700) with IBM Plex Sans Thai fallback are loaded from `src/styles/fonts/`. Mascot PNGs are served from `public/mascots/` and referenced via `withBase()`.
