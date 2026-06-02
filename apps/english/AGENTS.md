# Repository Guidelines

## Project Structure & Module Organization

This is a React 18 + Vite single-page app (exam taker + admin UI) backed by an Express + Prisma (SQL Server) API in `server/`. Application code lives in `src/`:

- `src/App.jsx` defines the version-aware exam flow (`buildFlow`), path routing (`/exam/full`, `/exam/short`, `/admin`, `/result`), and app-level tweaks.
- `src/screens/` contains landing, audio check, instructions, listening, end-of-listening, reading, and results screens.
- `src/admin/` contains the admin UI (content editor + attempts history) mounted at `/admin`.
- `src/components/` contains reusable UI and exam controls.
- `src/state/ExamContext.jsx` owns persisted state (`et-*` localStorage keys) plus the server attempt lifecycle (commit, autosave, submit).
- `src/data/examRepo.js` is the API client; `src/data/exam.js` shapes an API paper bundle into the `EXAM` structure.
- `src/lib/base.js` holds the base-path helpers (`BASE` / `withBase()` / `stripBase()`) — all URL and asset code must go through them.
- `src/styles/` contains plain CSS and design tokens.

The backend lives in `server/src/` (routes, scoring, CEFR banding, webhook delivery, OpenAPI spec); the Prisma schema and migrations are in `server/prisma/`. Static assets live in `public/`: audio in `public/voice/`, images in `public/pics/`, and fonts in `public/fonts/`. Build output goes to `dist/`. Treat `english-test-remix/` (gitignored, if present) as a reference bundle.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite development server (:5175, proxies `/api` to :3002).
- `npm run server` starts the Express API (nodemon); `npm run dev:all` runs both.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` serves the production build locally for verification.
- `npm test` runs the Vitest suite (Node env); `npm run test:watch` for watch mode.

Server-side scripts live in `server/package.json`: `migrate`, `migrate:dev`, `seed`, `studio`.

## Coding Style & Naming Conventions

Use ES modules, React functional components, and JSX. Match the existing style: 2-space indentation, single quotes, semicolons, and PascalCase component names. Name component files in PascalCase, for example `QuestionBlock.jsx`; use camelCase for helpers such as `examAudio.js`.

Keep styling in `src/styles/` unless a component owns a localized pattern. Use CSS custom properties such as `--color-primary`, `--bg-app`, and `--fg-*` instead of hard-coded colors where practical.

Internal code (DB columns, candidate/admin endpoints) is snake_case; everything parent-facing is camelCase via `toParentAttempt()` / `parentStatus()` in `server/src/routes/attempts.js` — do not leak snake_case into parent responses.

## Testing Guidelines

Vitest runs in a Node environment (no DOM) and picks up `src/**/*.test.{js,jsx}` and `server/**/*.test.js`. Existing tests cover `src/data/exam.js`, `server/src/scoring.js`, `server/src/shape.js`, and `server/src/cefr.js` — extend them when touching scoring, shaping, or CEFR logic.

For UI changes, manually verify the full flow (landing, audio check, listening, end of listening, reading, results) and the short flow where relevant. For exam data changes, confirm `src/data/exam.js` still maps all parts and referenced files in `public/voice/` exist.

## Commit & Pull Request Guidelines

Prefer concise Conventional Commit-style messages: `feat: ...`, `fix: ...`, `chore: ...`, or `docs: ...`.

Pull requests should include a summary, affected flow or files, manual verification steps, and screenshots or recordings for visible UI changes. Link related issues when available. Note changes to the seed JSONs (`papers_export_*.json`) or media filenames because they affect rendering.

## Security & Configuration Tips

Do not commit secrets or user-specific files; the seed JSONs (exam content + answer keys) are gitignored on purpose. `localStorage` keys prefixed with `et-` store exam progress locally; keep that behavior in mind when changing reset, navigation, or persistence logic. Parent-facing endpoints require `X-API-Key` (`PARENT_API_KEY`); admin endpoints use HTTP Basic auth and answer 503 when `ADMIN_USERNAME`/`ADMIN_PASSWORD` are unset.
