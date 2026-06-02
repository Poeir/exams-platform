# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server on port 5173 (opens browser)
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the built output

There is no test suite, linter, or type-checker configured.

## Origin and reference material

This project was bootstrapped from a Claude Design handoff bundle. The original prototype lives in `handoff/mbti/project/` (gitignored) as React-via-Babel HTML files — treat it as the visual reference, not source. Re-downloadable from `https://api.anthropic.com/v1/design/h/IYwHQVMhzL1wUDmG4KVOmw`. The chat transcript in `handoff/mbti/chats/chat1.md` captures the design intent.

## Architecture

Single-page React app with **in-memory screen routing** (no router library). `src/App.jsx` holds the global state — `screen`, `answers`, `resultCodeOverride` — and conditionally renders one screen component. Screens advance by calling callbacks (`onComplete`, `onBack`) that mutate `screen`.

**Flow:** `landing → purpose → quiz → loading-result → result ⟷ loading-compare → compare`

`src/components.jsx` contains all shared UI: `Mascot`, buttons, icons, `ProgressDots`, `Toast`, and `Loading` (animated ring). A `DevPanel` exists in `App.jsx` for dev-only screen/type jumping — it is intentionally absent from the design handoff prototype.

### Quiz engine (`src/screens/Quiz.jsx` + `src/lib/quizPath.js` + `src/data.js`)

The quiz path is **computed, not stored**. `buildPath(answers)` in `src/lib/quizPath.js` walks a fixed linear order and, when it reaches `q9-stress`, swaps in the branch question whose id is stored on the previous answer's `next` field (set by Q8's selected option). The selected option also carries hidden MBTI weights in `w` (e.g. `{ T: 1, J: 1 }`).

Three question formats coexist on the same `Quiz` component:
- `mcq` — single-select; answer is `{ optionId, w, next? }`
- `chat` — bubbles reveal on a timer, then reply options; answer is `{ optionId, w }`
- `slider` — distribute 100 points across N actions via an interactive donut picker; answer is `{ distribution, options }`. Only commits when total equals exactly 100.

**Mutating Q8's branching also requires updating `buildPath`'s `linear` array if you add more branched questions.**

### Scoring (`src/lib/scoring.js`)

`scoreAnswers(answers)` walks every answer's `w` (or for sliders: `(distribution[actionId] / 100) * 2 * option.w`) and accumulates signed sums across four axes (`E/I`, `S/N`, `T/F`, `J/P`). Sign picks the letter; magnitude divided by total weight produces the percent shown on trait bars. The slider multiplier of `×2` keeps slider answers comparable in influence to mcq answers.

Secondary **facets** (13 labels: `initiating`, `deepFocus`, `concrete`, `empathetic`, etc.) accumulate separately and produce a richer interpretation layer. Axis scores also yield **confidence levels**: `midzone` (<55%), `slight` (55–65%), `clear` (65–80%), `veryClear` (80%+), which flag near-50/50 axes as "both styles possible."

### Compare screen (`src/screens/Compare.jsx` + `src/lib/compareFit.js`)

Two type codes are compared side-by-side. `generateFit(codeA, codeB)` in `compareFit.js` counts axis differences to calibrate a summary tone, then returns three **synergy** and three **friction** bullets. Identical codes return a pre-written response warning about shared blind spots.

### Interactive donut slider (`src/lib/donutMath.js`)

Pure math for the slider UI. Key functions:
- `evenDistribution(actions)` — 25% per segment, remainder on last
- `moveBoundary(dist, ids, handleIdx, newPos)` — constrains drag between neighbours (±2% minimum per segment), maintains the invariant that all values sum to exactly 100
- `pointerAngleFraction(event, svgRef)` — converts pointer event to 0..1 circle fraction

### Data (`src/data.js`)

Two top-level exports:
- **`SCENARIOS`** — 14 question objects. Each option/action carries `w` (axis weights), `facets`, `evidence`, `risk`, `rationale`, and optionally `next` (branch target for Q8). Each scenario has an `assessment` block with `discrimination` (1.0–1.2 multiplier) and `difficulty`.
- **`TYPES`** — 16 MBTI type objects. Each has `code`, Thai/English role labels, `tagline`, `summary`, `strengths`, `comm`, `decision`, `feedback`, `blindspots`, `growthTips`, `workWithMe`, and `reminder`.

### Styling

`src/styles/app.css` imports `colors_and_type.css` (Gofive design tokens — `--color-*`, `--font-sans`, etc.) and adds all layout/screen-specific rules. The brand override at the top of `app.css` reuses the **Venio token name `--color-bluetiful` to hold empeo orange `#F05B2F`** — do not rename without sweeping the file. Four custom Gofive font weights (Text=400, Medium=500, Semi-Bold=600, Bold=700) with IBM Plex Sans Thai fallback are loaded from `src/styles/fonts/`. Mascot PNGs are served from `public/mascots/` and referenced by absolute path (`/mascots/name.png`).
