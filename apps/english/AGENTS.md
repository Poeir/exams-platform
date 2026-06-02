# Repository Guidelines

## Project Structure & Module Organization

This is a React 18 single-page app built with Vite. Application code lives in `src/`:

- `src/App.jsx` defines the linear exam flow and app-level tweaks.
- `src/screens/` contains landing, instructions, listening, reading, and results screens.
- `src/components/` contains reusable UI and exam controls.
- `src/state/ExamContext.jsx` owns persisted state.
- `src/data/exam.js` shapes content from `papers_export_1_full.json`.
- `src/styles/` contains plain CSS and design tokens.

Static assets live in `public/`: audio in `public/voice/`, images in `public/pics/`, and fonts in `public/fonts/`. Build output goes to `dist/`. Treat `english-test-remix/` as a reference bundle.

## Build, Test, and Development Commands

- `npm run dev` starts the Vite development server.
- `npm run build` creates a production build in `dist/`.
- `npm run preview` serves the production build locally for verification.

There is no configured test, lint, or format script. Before submitting changes, run `npm run build` to catch syntax and bundling errors.

## Coding Style & Naming Conventions

Use ES modules, React functional components, and JSX. Match the existing style: 2-space indentation, single quotes, semicolons, and PascalCase component names. Name component files in PascalCase, for example `QuestionBlock.jsx`; use camelCase for helpers such as `examAudio.js`.

Keep styling in `src/styles/` unless a component owns a localized pattern. Use CSS custom properties such as `--color-primary`, `--bg-app`, and `--fg-*` instead of hard-coded colors where practical.

## Testing Guidelines

No automated test framework is installed. Manually verify the full flow after UI or state changes: landing, audio check, listening, reading, and results. For exam data changes, confirm `src/data/exam.js` still maps all parts and referenced files in `public/voice/` exist.

If tests are added later, prefer colocated `*.test.jsx` files or a `src/__tests__/` folder and document the new command in `package.json`.

## Commit & Pull Request Guidelines

Recent history uses short subjects such as `feat: Enhance exam flow with detailed navigation and audio features` and `init`. Prefer concise Conventional Commit-style messages: `feat: ...`, `fix: ...`, `chore: ...`, or `docs: ...`.

Pull requests should include a summary, affected flow or files, manual verification steps, and screenshots or recordings for visible UI changes. Link related issues when available. Note changes to `papers_export_1_full.json` or media filenames because they affect rendering.

## Security & Configuration Tips

Do not commit secrets or user-specific files. `localStorage` keys prefixed with `et-` store exam progress locally; keep that behavior in mind when changing reset, navigation, or persistence logic.
