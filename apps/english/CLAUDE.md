# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This app normally runs mounted at `/english` behind the repo-root gateway — see the root `CLAUDE.md` for the gateway, shared-database, and parent-contract rules. This file covers the app's internals.

## Commands

- `npm run dev` — Vite dev server on :5175 (proxies `/api` → :3002)
- `npm run server` — the Express API via `server`'s dev script (nodemon, :3002 from `server/.env`)
- `npm run dev:all` — Vite + API together (concurrently)
- `npm run build` — production build to `dist/`
- `npm test` / `npm run test:watch` — Vitest (Node env, no DOM); picks up `src/**/*.test.{js,jsx}` and `server/**/*.test.js`. Existing tests: `server/src/scoring.test.js`, `shape.test.js`, `cefr.test.js`, `src/data/exam.test.js`.

Server-side (`cd server`): `npm run migrate` (prisma migrate deploy), `npm run migrate:dev`, `npm run seed`, `npm run studio`. The server owns the migration ledger for the `english` + `shared` schemas — see `server/README.md`.

There is no lint configured.

## Architecture

React 18 + Vite SPA (exam taker + admin UI) backed by an Express + Prisma (SQL Server / Azure SQL) API in `server/`. The frontend loads **all exam content from the API** — `papers_export_*.json` files are only seed sources for the database (`server/src/seed.js` / the admin "Seed from JSON" button).

### Flow state machine + routing (`src/App.jsx`)

The flow is built per **version** by `buildFlow(version)`:

- **Full** — Landing → AudioCheck → InstructionsListening → Listening → EndOfListening → InstructionsReading → Reading → Results (8 screens).
- **Short** (reading-only) — Landing → InstructionsReading → Reading → Results (4 screens).

Which set a paper is comes from its **name**: `paperVariant()` in `server/src/shape.js` classifies a paper as `'short'` when the name matches `\bshort\b` (case-insensitive) or contains Thai "สั้น"; exposed as `variant` on `GET /api/papers`. The flow that actually runs derives from the paper's **content** — a paper with no listening (Part 1–4) sections skips the audio screens regardless of its label. `SHORT_ENABLED` in `ExamContext.jsx` is the kill switch hiding every short entry point.

Path routing (no router library) into three zones, all through `stripBase()`:

- `/exam/full` and `/exam/short` — entry links; also the single locked URL for every test screen (the address bar never moves mid-exam, Back is trapped, `beforeunload` guards exits). `/` is an alias for the full landing.
- `/admin` — the admin UI (`src/admin/AdminApp.jsx`).
- `/result?view_token=…` — read-only result viewer for parent-minted view links.

A parent site launches a candidate at `/exam?t=<launch_token>` — no version segment; the flow follows the paper attached to the session.

Navigation inside the flow works two ways — be aware of this when adding any button:

1. **Tweaks panel** (dev only) — explicit `goTo(i)` jumps.
2. **Text-matched click hijacking** — a root-level `handleClick` reads `e.target.textContent` and matches `NEXT_PATTERNS` / `PREV_PATTERNS` ("start the test", "next question", "begin", "submit", "previous", …). Buttons inside screens generally do **not** wire their own `onClick` for navigation. Reuse an existing phrase or extend the patterns in `App.jsx`.

### Base-path handling (`src/lib/base.js`)

`BASE` / `withBase()` / `stripBase()` driven by `import.meta.env.BASE_URL` (`''` standalone, `/english` behind the gateway). All URL, route, and asset code must go through these helpers.

### Exam data (`src/data/exam.js` + `src/data/examRepo.js`)

`examRepo.js` is the API client (papers, sections, items, attempts, seed, admin). `exam.js` is data-shape only: `buildExam(bundle)` turns an API `{ paper, sections }` bundle into `EXAM = { meta, parts, flat }`:

- Two paper structures are supported: **TOEIC-style** (section names contain "Part N", folded into `PART_META`: Parts 1–4 Listening, 5–6 Vocabulary/Grammar, 7 Reading Comprehension) and **native** (the short placement paper — sections become parts in bundle order, skill from the `skill` column).
- Each part is composed of **groups** (passage + items, or one-item groups). UI code iterates this unified shape.
- Helpers: `partsBySection`, `totalsBySection`, `computeScores`, `computeSectionTotals`, `getOptionLetters` (filters the `_extras` key).
- Listening audio paths live in `PART_AUDIO`; the mp3s under `public/voice/` are referenced by it (rename in lockstep) and resolved via `withBase()`.

### Exam state (`src/state/ExamContext.jsx`)

Persisted to `localStorage` under `et-*` keys: `answers` (`{[itemId]: 'A'|…}`), `flagged` (Set, serialized as array), `position` (`{partNumber, groupIndex}`), `attempt-id`. Other state: `mode` (`'strict'` = auto-play audio + countdowns + locked nav, `'free'` = dev), `secondsPerItem`, `version` (`'full' | 'short'`).

A single test-wide clock governs real runs: `startExamTimer()` stamps `examStartedAt`; `examTotalSeconds` (paper `time_limit_min`, falling back to `VERSIONS`) drives `useExamCountdown`; expiry jumps straight to Results.

`commitAttempt()` creates the server-side attempt row (anonymous walk-ins) or reuses the one consumed from a launch token (parent sessions). Answers autosave to `PATCH /api/attempts/:id/answers` (~500 ms debounce); `submitFinal()` posts for server-side scoring. `enterSection('listening'|'reading')` snaps `position` to that section's first part; `resetExam` clears answers/flags.

### Theming

Plain CSS in `src/styles/` (`colors-and-type.css` + `styles.css`) with CSS custom properties (`--color-primary`, `--bg-app`, `--fg-*`, `--gf-*`). The dev-only `TweaksPanel` (bottom-right) live-switches brand color, atmosphere, and corner style via a `<style id="__tweaks-css">` tag written by `buildCSS` in `App.jsx`. The base `.et` class scopes the brand variables. Custom Gofive fonts live in `public/fonts/`, declared in `src/styles/colors-and-type.css`.

## Backend (`server/`)

Express app built in `server/src/app.js` (exported, never listens — the gateway mounts it; `server/src/index.js` is the standalone entrypoint). Prisma Client over the shared SQL Server DB (`server/src/db.js`); JSON columns are `NVARCHAR(MAX)` strings serialized via `server/src/json.js`.

- **Content routes** (`routes/papers.js`, `sections.js`, `items.js`, `seed.js`) — CRUD + seed; mutations and seed require HTTP Basic admin auth (`ADMIN_USERNAME`/`ADMIN_PASSWORD`; unset = admin endpoints answer 503). Taker fetches omit answer keys; `?withAnswers=1` (admin) includes them.
- **Attempts** (`routes/attempts.js`) — sessions/launch-token handshake, consume, autosave, submit (server-side scoring in `scoring.js`, CEFR banding in `cefr.js`), webhook redeliver, view links, subject result history, admin attempt views. Parent-facing responses go through `toParentAttempt()` / `parentStatus()` (camelCase, `submitted` → `completed` on the wire) — never leak snake_case to the parent.
- **Webhooks** (`webhook.js`) — result snapshot POSTed to the attempt's callback URL, HMAC-signed with `PARENT_API_KEY` (`X-Signature: sha256=<hmac>`), retries bounded by `WEBHOOK_*` envs.
- **OpenAPI** — spec in `server/src/openapi.js`, served at `GET /api/openapi.json` + Swagger UI at `/api/docs`. Keep it in sync when adding/changing routes.
- **Media** (`routes/media.js` + `azureStorage.js`) — admin uploads via `PUT /api/media` (Basic auth) stream to Azure Blob Storage through a server-held container SAS and return an opaque blob name (stored in an item's `_extras.image_url`/`audio_url`); candidates read via the public proxy `GET /api/media/:name`. The account has anonymous read disabled, so the SAS never reaches the browser — resolve stored names through `resolveMediaUrl()` in `src/lib/base.js`. `AZURE_STORAGE_*` env (unset = uploads 503); rotate the SAS in env without code/content changes. One-off Cloudinary→Azure migration: `npm run migrate:media` in `server/`.
- `GET /api/config` serves a public `uploadEnabled` flag (Azure storage configured?) so the frontend bundle stays config-free.

## Important repo notes

- `papers_export_1_full.json` / `papers_export_2_short.json` are gitignored seed sources read by `server/src/seed.js` (and the admin UI seed button). The frontend never imports them.
- `english-test-remix/` (if present) is a gitignored Claude Design handoff bundle — read-only design reference; the React app under `src/` is the implementation.
- `public/voice/` mp3 filenames are referenced by `PART_AUDIO` in `src/data/exam.js` — rename in lockstep.
