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
**Runtime Support**: Bun 1.2+ (primary runtime for optimal performance)

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

### Bun Runtime Environment
This project uses Bun as the primary runtime environment for optimal performance and developer experience:

### Development Commands
- `npm run dev` - Run CLI with Bun (fast startup and execution)
- `npm run dev:node` - Run CLI with Node.js and ts-node (legacy fallback)
- `npm run test` - Run tests with Bun test runner (native execution)
- `npm run test:watch` - Run tests in watch mode with Bun for TDD development
- `npm run test:coverage` - Run tests with built-in coverage reporting
- `npm run build` - Build with Bun bundler (sub-second builds)
- `npm run build:node` - Build with TypeScript compiler (legacy fallback)
- `npm run lint` - Code linting and formatting with Biome v2
- `npm run lint:fix` - Auto-fix linting issues with Biome v2
- `npm run format` - Format code with Biome v2  
- `npm run check` - Combined lint and typecheck validation
- `npm run typecheck` - TypeScript type checking
- `npm run typecheck:bun` - TypeScript type checking via Bun

### Performance Benefits
- **CLI Startup**: Bun provides 2-3x faster startup than Node.js with ts-node (measured: 0.589s vs 1.314s)
- **Test Execution**: Bun native test runner provides fast execution (~15s for 39 tests)
- **Build Speed**: Bun provides sub-second builds (measured: 268ms vs traditional compilation)
- **Development Experience**: Bun eliminates TypeScript compilation step during development
- **Test Coverage**: Built-in coverage reporting with comprehensive metrics (95.45% function, 100% line coverage)

### Installation
- **Bun**: `bun install` (recommended for optimal performance)
- **Node.js**: `npm install` (fallback option)

### Runtime Setup

#### Bun Installation (Recommended)
```bash
# Install Bun (macOS/Linux)
curl -fsSL https://bun.sh/install | bash

# Install Bun (Windows)
powershell -c "irm bun.sh/install.ps1 | iex"

# Install project dependencies
bun install
```

#### Development Workflow
The project is optimized for Bun runtime with Node.js fallback options:

**Bun (Recommended)**:
- Native TypeScript execution without compilation
- Faster CLI startup and development feedback
- Built-in test runner with coverage
- Modern JavaScript runtime optimized for development
- Primary development environment for best experience

**Node.js (Legacy Fallback)**:
- Traditional ts-node development workflow
- Standard TypeScript compilation pipeline
- Compatible with existing Node.js tooling
- Available for environments where Bun is not available

**Recommended Workflow**:
- Use primary commands (`dev`, `test`, `build`) for optimal Bun experience
- Use `:node` suffixed commands only when Bun is unavailable
- Bun provides superior performance and developer experience
