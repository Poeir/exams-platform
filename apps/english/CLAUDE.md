# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build

There is no lint or test runner configured.

## Architecture

This is a single-page React 18 + Vite app that renders a TOEIC-style English proficiency test (Gofive branding). The entire UX is one linear flow with no router.

### Flow state machine (`src/App.jsx`)

`App.jsx` defines `FLOW`, a fixed array of seven screens: Landing → AudioCheck → InstructionsListening → Listening → InstructionsReading → Reading → Results. `FinalApp` holds an `idx` cursor; navigation happens via two mechanisms that you must be aware of when adding any button:

1. **Tweaks panel** — explicit `goTo(i)` calls.
2. **Text-matched click hijacking** — `handleClick` listens on the root, reads `e.target.textContent`, and matches against `NEXT_PATTERNS` / `PREV_PATTERNS`. Any `<button>` whose visible text contains a phrase like "start the test", "next question", "begin", "submit", "previous", etc. advances/retreats the flow. **Buttons inside screens do not wire up `onClick` for navigation — they rely on this global text match.** If you add a navigation button, either reuse one of the existing phrases or extend the patterns in `App.jsx`.

When a `FLOW` step has `enterSection`, `goTo` calls `ExamContext.enterSection(...)` to reset `position` to the first part of that section.

### Exam data (`src/data/exam.js`)

`papers_export_1_full.json` is the single source of truth for all exam content (parts, items, passages, answer keys). `exam.js` shapes it at module load into `EXAM = { meta, parts, flat }`:

- **Parts 1–4** are Listening, **5–6** Vocabulary/Grammar (reading section), **7** Reading Comprehension. Part metadata (title, skill, section, whether to show a passage, audio path) lives in `PART_META` / `PART_AUDIO` inside this file.
- Each part is composed of **groups**. For parts with `showPassage`, each input section becomes one group (passage + multiple items). For non-passage parts, each item becomes its own one-item group. This unified shape is what UI code iterates over.
- Helpers: `partsBySection`, `totalsBySection`, `computeScores`, `computeSectionTotals`, `getOptionLetters` (filters out the `_extras` key).

### Exam state (`src/state/ExamContext.jsx`)

`ExamProvider` wraps the app in `App.jsx`. State is persisted to `localStorage` under the `et-*` keys:

- `answers` — `{ [itemId]: 'A' | 'B' | ... }`
- `flagged` — `Set<itemId>` (serialized as array)
- `position` — `{ partNumber, groupIndex }`, the cursor inside the exam used by `ExamSection`
- `mode` — `'strict' | 'free'`. **Strict** auto-plays audio, runs a countdown, and blocks manual navigation. **Free** is for development — full control, no timers.
- `secondsPerItem` — strict-mode countdown duration

Resetting / re-entering: `enterSection('listening' | 'reading')` snaps `position` to the first part of that section. `resetExam` clears answers and flags.

### Screens and components

`Listening.jsx` and `Reading.jsx` are thin wrappers around `components/ExamSection.jsx`, which is the workhorse rendering passages, audio bar, question blocks, and the part navigator. Listening parts use `PART_AUDIO` mp3s from `public/voice/`; the audio bar's behavior (auto-play, post-audio answer window, lock state) depends on `mode`.

### Theming (`buildCSS` in `App.jsx` + `components/TweaksPanel.jsx`)

There is no Tailwind / styled-components. Styling is plain CSS in `src/styles/` (`colors-and-type.css` + `styles.css`) with CSS custom properties (`--color-primary`, `--bg-app`, `--fg-*`, `--gf-*`). The dev-only `TweaksPanel` (bottom-right floating panel) lets you live-switch brand color, atmosphere (light/default/dark), and corner style (sharp/default/soft). `buildCSS` writes overrides into a `<style id="__tweaks-css">` tag on every change. The base `.et` class on screens scopes the brand variables.

## Important repo notes

- **`english-test-remix/` is a Claude Design handoff bundle** (HTML/CSS/JS prototypes + chat transcripts) and is gitignored. Treat it as a read-only design reference. Do not edit files there or copy its structure verbatim — the React app under `src/` is the implementation. Only consult it when the user asks about the original design intent.
- `papers_export_1_full.json` at the repo root is imported directly by `src/data/exam.js`. Changing it changes the entire exam.
- `public/voice/` mp3 filenames are referenced by `PART_AUDIO` in `exam.js` — rename in lockstep.
- Custom Gofive fonts live in `public/fonts/` and are declared in `src/styles/colors-and-type.css`.
