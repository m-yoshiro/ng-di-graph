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
**Runtime Support**: Node.js 18+ and Bun 1.2+ (dual runtime compatibility)

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
- Write tests first using `npm run test:watch` (Bun test runner)
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

### Dual Runtime Support
This project supports both Node.js and Bun runtimes, with Bun as the primary development environment for optimal performance:

### Development Commands
- `npm run dev` - Run CLI with Bun (3x faster startup)
- `npm run test` - Run tests with Bun test runner (8-13x faster than traditional runners)
- `npm run test:watch` - Run tests in watch mode with Bun for TDD development
- `npm run test:coverage` - Run tests with built-in coverage reporting
- `npm run build` - Build with TypeScript compiler
- `npm run build:bun` - Build with Bun bundler (2.4x faster, smaller output)
- `npm run lint` - Code linting and formatting with Biome
- `npm run lint:fix` - Auto-fix linting issues with Biome
- `npm run format` - Format code with Biome  
- `npm run check` - Combined lint and typecheck validation
- `npm run typecheck` - TypeScript type checking
- `npm run typecheck:bun` - TypeScript type checking via Bun

### Performance Comparison
- **CLI Startup**: Bun is 3x faster than Node.js with ts-node (0.25s vs 0.73s)
- **Test Execution**: Bun is 8-13x faster than traditional Node.js test runners (~0.25s vs 2+ seconds for test suite)
- **Build Speed**: Bun is 2.4x faster than TypeScript compiler (0.28s vs 0.66s)  
- **Memory Usage**: Bun uses 22% less memory during development
- **Test Coverage**: Bun provides built-in coverage reporting with no performance penalty

### Installation
- **Node.js**: `npm install`
- **Bun**: `bun install` (automatically creates bun.lock alongside package-lock.json)