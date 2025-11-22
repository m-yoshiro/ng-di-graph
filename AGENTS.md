# Repository Guidelines

## Environment Requirements
- Node.js 20.x LTS (use `mise use` / `mise x node@$(cat .node-version) -- <command>` to match `.node-version`)
- npm 10+ (bundled with Node 20). When the sandbox shell still reports Node 19.x, prefix commands with `mise x node@$(cat .node-version) -- npm <command>` to stay on the supported runtime.

## Project Structure & Module Organization
The CLI lives in `src/` with `cli/` for entry points, `core/` for graph analysis, `formatters/` for JSON/Mermaid emitters, and `tests/` for shared fixtures used in unit specs. Top-level `tests/` hosts integration-like Vitest suites (`*.test.ts`) while build output lands in `dist/`. Documentation relevant to workflows sits under `docs/` (see `docs/rules/tdd-development-workflow.md` for process) and coverage artifacts are written to `coverage/` after `npm run test:coverage`.

## Build, Test, and Development Commands
Run `npm install` once, then use `npm run dev` for an interactive CLI session (tsx + Node). `npm run build` performs a tsup bundle to `dist/cli/index.js`; run `npm run clean` before regenerating artefacts. Quality gates: `npm run lint` (Biome v2 lint), `npm run format` / `npm run format:check` (Biome formatter), `npm run check` (lint + `tsc --noEmit`), and `npm run typecheck`. Execute `npm run test`, `npm run test:watch`, or `npm run test:coverage` via Vitest depending on the TDD phase. CI mirrors the npm commands and uses `npm pack --pack-destination tmp-toolchain/` to capture the distributable tarball.

## Coding Style & Naming Conventions
TypeScript uses 2-space indentation, LF endings, and 100-character lines enforced by Biome v2 (`biome.json`). Prefer descriptive camelCase for functions/variables, PascalCase for exported types/classes, and kebab-case for branch names (`feat/cli-entry`). Keep modules single-purpose; new formatters belong under `src/formatters/`, parsing helpers under `src/core/`. Run `npm run lint:fix` before pushing to auto-apply organizer rules and import sorting.

## Testing Guidelines
Tests run on Vitest (Node environment). Mirror the describe/it nesting already present in `src/tests` and `tests/` and suffix files with `.test.ts`. Follow the mandated TDD workflow: write the failing spec with `npm run test:watch`, implement, then refactor. Maintain at least the configured coverage thresholds (≥90% functions, ≥79% lines/statements, ≥67% branches) and continue pushing toward ≥95% line coverage across critical modules. Include regression tests for every bug fix and prefer fixture builders from `src/tests/fixtures/` for graph inputs.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat(parser): ...`, `fix(graph-builder): ...`) and keep messages scoped to the touched module. Each PR should describe the behavior change, link related issues, include test/coverage notes, and paste CLI output for `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, `npm run build`, and `npm run check`. Capture the logs under `tmp-toolchain/*.log` plus the pack artefact `tmp-toolchain/ng-di-graph-0.1.0.tgz` (generated via `npm pack --pack-destination tmp-toolchain/`) so reviewers can verify the reproducible npm workflow. Open PRs only after rebasing onto `main` and ensure CI is green; screenshots or Mermaid snippets are encouraged when the change affects generated diagrams.
