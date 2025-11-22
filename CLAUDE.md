# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

This project uses structured documentation in the `docs/` directory:

- **@docs/prd/mvp-requirements.md** - Complete project specifications including functional requirements, CLI interface, data models, error handling, testing plan, and technical constraints
- **@docs/rules/ai-development-guide.md** - General AI development guidelines and best practices
- **@docs/instructions/tdd-development-workflow.md** - Mandatory TDD methodology and file management guidelines

## Project Overview

**ng-di-graph** is a command-line tool that analyzes Angular TypeScript codebases to extract dependency injection relationships and output dependency graphs. The tool uses ts-morph for AST parsing and supports JSON and Mermaid output formats.

**Target Angular Versions**: 17-20  
**Core Dependencies**: ts-morph (for TypeScript AST parsing)  
**Runtime Support**: Node.js 20.x LTS + npm 10 (npm-first toolchain)

## Architecture

### Core Components
- **Parser**: Uses ts-morph to analyze TypeScript files and extract DI information from decorated classes (`@Injectable`, `@Component`, `@Directive`)
- **Graph Builder**: Constructs in-memory dependency graph from parsed constructor parameters
- **Output Formatters**: Renders graphs as JSON or Mermaid flowcharts
- **CLI Interface**: Command-line interface with support for project configuration, filtering, and output options

### Data Model

See @docs/prd/mvp-requirements.md#10-data-model-typescript for complete TypeScript interfaces including Node, Edge, EdgeFlags, and Graph definitions.

## Development Requirements

### TDD Workflow (MANDATORY)
- **All features must follow Test-Driven Development**
- TDD Cycle: Red (failing test) → Green (minimal code) → Refactor → Repeat
- Write tests first using `npm run test:watch` (Vitest watch mode)
- Test component behavior, inputs, outputs before implementation
- Test service methods, signal updates, side effects before coding

### File Management
- **Project Directory Only**: Never create, modify, or delete files outside current project directory
- **Temporary Files**: Use `./tmp/` directory for temporary outputs, diff files, etc.
- **Clean Up**: Remove temporary files after use when possible

## CLI Interface

See @docs/prd/mvp-requirements.md#11-cli-interface for complete CLI specification including all options and usage examples.

## Key Features

See @docs/prd/mvp-requirements.md#6-functional-requirements for complete functional requirements (FR-01 through FR-14) including core functionality, circular dependency detection, verbose mode, and bidirectional filtering.

## Error Handling

See @docs/prd/mvp-requirements.md#13-error-handling for complete error handling specifications including file parsing failures, type resolution issues, and memory constraints.

## Performance Requirements

See @docs/prd/mvp-requirements.md#7-non-functional-requirements for complete non-functional requirements including performance targets, dependency constraints, and CI compatibility.

## Testing Strategy

See @docs/prd/mvp-requirements.md#14-test-plan for complete testing specifications including unit test cases (TC-01 through TC-10), acceptance criteria, and coverage requirements.

## Development Commands

### Node Toolchain
This project standardizes on Node.js 20.x LTS and npm 10+. Use `mise use node@$(cat .node-version)` (or prefix commands with `mise x node@$(cat .node-version) -- npm <command>`) to ensure the correct runtime before installing dependencies.

### Development Commands
- `npm install` - Install dependencies (lockfile is authoritative)
- `npm run dev` / `npm run dev:node` - Run the CLI entry via tsx for interactive debugging
- `npm run test` - Execute the Vitest suite once
- `npm run test:watch` - Run Vitest in watch mode for TDD
- `npm run test:coverage` - Collect coverage via Vitest + @vitest/coverage-v8
- `npm run lint` - Run Biome checks
- `npm run lint:fix` - Auto-fix Biome diagnostics
- `npm run format` / `npm run format:check` - Apply or verify formatting
- `npm run typecheck` - Invoke `tsc --noEmit`
- `npm run check` - Combined lint + typecheck gate
- `npm run build` - Clean + bundle via tsup into `dist/cli/index.js`
- `npm run clean` - Remove `dist/`
- `npm pack --pack-destination tmp-toolchain/` - Produce the distributable tarball for review/CI validation

### Reproducibility Artefacts
- Capture console output from `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, `npm run build`, and `npm run check` under `tmp-toolchain/*.log`.
- Keep `tmp-toolchain/ng-di-graph-0.1.0.tgz` (generated via `npm pack --pack-destination tmp-toolchain/`) current and reference it in PR descriptions to prove the npm workflow end-to-end.

### Tooling Notes
- Development runtime: Node.js 20.x via tsx (no Bun dependency).
- Tests: Vitest running in the Node environment; coverage thresholds currently ≥90% functions, ≥79% lines/statements, ≥67% branches (see `vitest.config.mts`).
- CI: GitHub Actions installs Node 20.x/22.x via `actions/setup-node`, runs `npm ci`, and executes the npm scripts above plus `npm pack`.
