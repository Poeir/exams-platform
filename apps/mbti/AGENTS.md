# Repository Guidelines

## Project Structure & Module Organization

This is a Vite React single-page app for an MBTI workplace quiz. Source code lives in `src/`: `App.jsx` owns in-memory screen routing and shared state, `screens/` contains page-level views, `lib/` contains reusable quiz/result helpers, and `data.js` defines quiz content and scoring inputs. Global styles are in `src/styles/`, including local Gofive font files. Static mascot PNGs live in `public/mascots/` and use absolute paths such as `/mascots/chart.png`. Production output is generated into `dist/`; do not edit it by hand.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite dev server on port `5173` and opens the browser.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the built output for local verification.

There is no configured test, lint, or type-check script. Run `npm run build` before handoff to catch syntax and bundling issues.

## Coding Style & Naming Conventions

Use modern React with functional components and ES modules. Follow the existing style: two-space indentation, semicolons, single quotes, and descriptive camelCase names. Components and screen files use PascalCase, for example `Quiz.jsx` and `Result.jsx`. Keep shared logic in `src/lib/` instead of duplicating it inside screens. CSS custom properties come from `src/styles/colors_and_type.css`; prefer existing tokens before adding colors or font rules.

## Testing Guidelines

No automated test framework is installed. For logic-heavy changes, especially scoring or quiz branching, add focused tests only after introducing an agreed test runner. Until then, manually verify the main flow: landing, onboarding, quiz, result, readme, and compare views. When changing `src/data.js`, confirm all answer formats still work: `mcq`, `chat`, and `slider`.

## Commit & Pull Request Guidelines

Recent commits use Conventional Commit-style prefixes, such as `feat:` and `chore:`. Keep messages short and imperative, for example `feat: add result sharing panel`. Pull requests should include a brief summary, manual verification steps, and screenshots or screen recordings for UI changes. Link related issues or design notes when available, and call out changes to scoring, branching, or brand tokens because those affect product behavior and visual consistency.

## Agent-Specific Notes

The original design handoff under `handoff/` is reference material, not active source. Preserve the current in-memory routing model unless the task explicitly introduces a router. Mascot assets and brand styling are part of the experience, so verify affected screens visually after UI changes.
