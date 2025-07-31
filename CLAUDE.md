# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation

This project uses structured documentation in the `docs/` directory:

- **@docs/prd/mvp-requirements.md** - Complete project specifications including functional requirements, CLI interface, data models, error handling, testing plan, and technical constraints
- **@docs/instructions/tdd-development-workflow.md** - Mandatory TDD methodology and file management guidelines

## Project Overview

**ng-di-graph** is a command-line tool that analyzes Angular TypeScript codebases to extract dependency injection relationships and output dependency graphs. The tool uses ts-morph for AST parsing and supports JSON and Mermaid output formats.

**Target Angular Versions**: 17-20
**Core Dependencies**: ts-morph (for TypeScript AST parsing)

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
- Write tests first using `npm run test:watch`
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

When implementing, ensure these commands are available:
- `npm run test:watch` - Run tests in watch mode for TDD development
- `npm run build` - Build the CLI tool
- `npm run lint` - Code linting
- `npm run typecheck` - TypeScript type checking