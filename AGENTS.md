# Repository Guidelines

## Environment Requirements
- Node.js 20.x LTS (use `mise use` / `mise x node@$(cat .node-version) -- <command>` to match `.node-version`)
- npm 10+ (bundled with Node 20) for running scripts until the npm-first migration completes

## Project Structure & Module Organization
The CLI lives in `src/` with `cli/` for entry points, `core/` for graph analysis, `formatters/` for JSON/Mermaid emitters, and `tests/` for shared fixtures used in unit specs. Top-level `tests/` hosts integration-like Bun suites (`*.test.ts`) while build output lands in `dist/`. Documentation relevant to workflows sits under `docs/` (see `docs/instructions/tdd-development-workflow.md` for process) and coverage artifacts are written to `coverage/` after `bun test --coverage`.

## Build, Test, and Development Commands
Run `bun install` (or `npm install`) once, then use `bun run dev` for an interactive CLI session or `bun run dev:node` when debugging via ts-node. `bun run build` produces the distributable CLI by bundling to `dist/cli/index.js`; pair it with `bun run clean` before fresh builds. Quality gates: `bun run lint` (Biome v2 lint), `bun run format` (Biome v2 formatter), `bun run check` (lint + `tsc --noEmit`), and `bun run typecheck`. Execute `bun test`, `bun test --watch`, or `bun test --coverage` depending on the TDD phase; CI mirrors these scripts.

## Coding Style & Naming Conventions
TypeScript uses 2-space indentation, LF endings, and 100-character lines enforced by Biome v2 (`biome.json`). Prefer descriptive camelCase for functions/variables, PascalCase for exported types/classes, and kebab-case for branch names (`feat/cli-entry`). Keep modules single-purpose; new formatters belong under `src/formatters/`, parsing helpers under `src/core/`. Run `bun run lint:fix` before pushing to auto-apply organizer rules and import sorting.

## Testing Guidelines
Tests are written with Bun’s `bun:test`. Mirror the describe/it nesting already present in `src/tests` and `tests/` and suffix files with `.test.ts`. Follow the mandated TDD workflow: write the failing spec with `bun test --watch`, implement, then refactor. Maintain ≥90% function coverage and ≥95% line coverage (see `coverage/index.html` before submission). Include regression tests for every bug fix and prefer fixture builders from `src/tests/fixtures/` for graph inputs.

## Commit & Pull Request Guidelines
Use Conventional Commits (`feat(parser): ...`, `fix(graph-builder): ...`) and keep messages scoped to the touched module. Each PR should describe the behavior change, link related issues, include test/coverage notes, and paste CLI output for `bun run lint`, `bun run typecheck`, `bun test`, and `bun run build`. Open PRs only after rebasing onto `main` and ensure CI is green; screenshots or Mermaid snippets are encouraged when the change affects generated diagrams.
