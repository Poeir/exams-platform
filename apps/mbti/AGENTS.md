# Repository Guidelines

## Project Structure & Module Organization

This is a Vite React single-page app for an MBTI workplace quiz, backed by an Express + Prisma (SQL Server) API. Frontend source lives in `src/`: `App.jsx` owns in-memory screen routing and shared state, `screens/` contains page-level views (`Landing`, `Quiz`, `Result`), `lib/` contains reusable quiz/result helpers (scoring, quiz path, donut math, API clients, base-path helpers), and `data.js` defines quiz content and scoring inputs. Global styles are in `src/styles/`, including local Gofive font files. Static mascot PNGs live in `public/mascots/` and are referenced through `withBase()` from `src/lib/base.js` (the app may be mounted at `/mbti` behind the gateway). The backend lives in `server/` (`app.js` exports the Express app; `index.js` is the standalone listener on :3001). The `mbti` database schema is applied via the SQL scripts in `prisma/` — never `prisma migrate dev` / `db push` against the shared database. Production output is generated into `dist/`; do not edit it by hand.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite dev server on port `5174` (opens the browser; proxies `/api` to :3001).
- `npm run server` starts the Express API in watch mode on :3001.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the built output for local verification.
- `npm run api:smoke` runs the end-to-end smoke test against the running API.

There is no configured test, lint, or type-check script. Run `npm run build` before handoff to catch syntax and bundling issues.

## Coding Style & Naming Conventions

Use modern React with functional components and ES modules. Follow the existing style: two-space indentation, semicolons, single quotes, and descriptive camelCase names. Components and screen files use PascalCase, for example `Quiz.jsx` and `Result.jsx`. Keep shared logic in `src/lib/` instead of duplicating it inside screens. CSS custom properties come from `src/styles/colors_and_type.css`; prefer existing tokens before adding colors or font rules. Everything parent-facing on the API is camelCase with terminal status `completed` (the unified contract shared with the english engine).

## Testing Guidelines

No automated test framework is installed. For logic-heavy changes, especially scoring or quiz branching, add focused tests only after introducing an agreed test runner. Until then, manually verify the main flow: landing, purpose, quiz, and result. When changing `src/data.js`, confirm all answer formats still work: `mcq`, `chat`, and `slider`. For API changes, run `npm run api:smoke` and keep `docs/openapi.yaml` in sync.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit-style prefixes, such as `feat:` and `chore:`. Keep messages short and imperative, for example `feat: add result sharing panel`. Pull requests should include a brief summary, manual verification steps, and screenshots or screen recordings for UI changes. Link related issues or design notes when available, and call out changes to scoring, branching, or brand tokens because those affect product behavior and visual consistency.

## Agent-Specific Notes

The original design handoff under `handoff/` is reference material, not active source. Preserve the current in-memory routing model unless the task explicitly introduces a router. Mascot assets and brand styling are part of the experience, so verify affected screens visually after UI changes. URL and asset code must go through `withBase()` so the app works both standalone and mounted at `/mbti`.
