# Implementation Plan Template

**Created by**: implementation-planner  
**Executed by**: implementation-executor  
**Date**: 2025-11-30  
**Version**: v0.1  
**Status**: In Progress

---

## 1. Overview

### Feature/Task Description
Eliminate ambient `console.*` dependencies from core modules by routing logging/output through explicit dependencies (Logger or injected writer), keeping CLI console usage as the only process-bound boundary.

**Goal**: Make logging in core code explicit and injectable to avoid ambient context coupling and improve testability.  
**Scope**: `src/core/**` and helpers invoked from core paths; align tests accordingly. CLI user-facing console output remains unchanged.  
**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#logging-and-cli-behavior
- **Related Documentation**: @docs/rules/ai-development-guide.md, @docs/rules/tdd-development-workflow.md, @docs/plans/tasks/2025-10-29-verbose-mode-implementation-plan.md
- **Dependencies**: Existing `Logger` interface in `src/core/logger.ts`; CLI verbose flag behavior; ErrorHandler patterns.

---

## 2. Technical Approach

### Architecture Decisions
- Leverage `Logger` interface for verbose and warning output in core modules; keep it optional to preserve current verbosity toggles while avoiding any ambient `console.*` paths in core (noop when logger absent).
- Pass optional `Logger` (or output writer) via function constructors/parameters instead of importing `console`; CLI supplies a real or no-op logger for verbose flows so core never binds to process globals.
- Preserve CLI console usage for user-facing messages; structured logs continue to go to stderr via `Logger`.
- Add automated guard coverage to fail if `console.*` re-enters `src/core/**`.

**Design Pattern**: Dependency injection for logging/output to remove ambient context.  

**Technology Stack**:
- TypeScript (Node 20), ts-morph, Vitest, Biome.
- Existing `Logger` implementation for structured logs.

**Integration Points**:
- `src/cli/index.ts` constructs `Logger` and passes to core modules.
- `src/core/graph-filter.ts` and `src/core/parser.ts` consume optional `Logger`.
- Formatters/output handlers remain unchanged except for logger threading if needed.

**Logging-Level Mapping**:
- Former `console.log` verbose/diagnostic messages → `logger.debug` (or `logger.info` where user-level verbose info is intended).
- Former `console.warn` → `logger.warn`.
- Any `console.error` in core → `ErrorHandler` for operational failures; `logger.error` for diagnostic context in verbose flows.

### File Structure
```
src/
├── core/
│   ├── graph-filter.ts       # Add optional logger parameter; remove console usage
│   └── parser.ts             # Replace console.* with logger/ErrorHandler
└── cli/
    └── index.ts              # Ensure logger passed into core calls; console only for UI

tests/
├── helpers/                  # Adjust logger mocks/spies as needed
└── *.test.ts                 # Update expectations for logging pathways
```

### Data Flow
1. CLI constructs a real or no-op `Logger` based on verbose flag and passes it to parser/graph-filter/formatters so core never uses global console.
2. Core modules emit logs via `Logger` (stderr) and structured stats; no direct `console.*` paths.
3. User-facing stdout remains via CLI console pathways or output handler.

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [x] **Task 1.1**: Inventory and classify `console.*` usage in core paths
  - **TDD Approach**: Add/adjust a unit test that fails when core code logs via global console (e.g., `vi.spyOn(console, 'log')`/`console.warn` and assert no calls when invoking core functions).
  - **Implementation**: Identify production `console.*` in `src/core/**`; document intended logger mapping.
  - **Acceptance Criteria**: List of all core `console.*` call sites with planned replacements.

- [x] **Task 1.2**: Define logger threading contracts
  - **TDD Approach**: Add/adjust type-level test or compile-time expectation (tsd-style via typecheck) ensuring optional logger is accepted where needed.
  - **Implementation**: Decide parameter additions (e.g., logger arg for `filterGraph`, propagate through call sites); ensure types updated.
  - **Acceptance Criteria**: Signatures updated with optional logger; CLI compile check passes.

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 1 day

- [x] **Task 2.1**: Refactor parser logging
  - **TDD Approach**: Write/adjust parser verbose tests to assert logger usage instead of console; ensure warnings still surface appropriately.
  - **Implementation**: Replace `console.log/warn` in `src/core/parser.ts` with `Logger` or `ErrorHandler` calls; guard on verbose flag with logger present.
  - **Acceptance Criteria**: No direct `console.*` in parser; verbose output observable via logger mocks; existing behavior preserved.

- [x] **Task 2.2**: Refactor graph filter logging
  - **TDD Approach**: Update bidirectional/filtering tests to assert logger calls when verbose; ensure user-facing output unaffected.
  - **Implementation**: Add optional logger parameter to `filterGraph`; replace console usage; update CLI invocation.
  - **Acceptance Criteria**: Graph filter emits via logger when provided; CLI still prints verbose info as before; typecheck passes.

- [x] **Task 2.3**: Sweep other core modules
  - **TDD Approach**: Add a guard test to fail if `console.*` remains in `src/core/**` (lint rule or targeted test).
  - **Implementation**: Remove/replace any remaining core `console.*`; ensure formatters/output handler unchanged unless needed for logger threading.
  - **Acceptance Criteria**: `rg console` in core returns empty; functionality unchanged.

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.5 day

- [ ] **Task 3.1**: Update test helpers and fixtures
  - **Implementation**: Adjust logger mocks/spies in `tests/helpers` to capture new logger calls; clean up console spies no longer needed.
  - **Acceptance Criteria**: Tests reflect new logging pathway; no brittle console expectations remain.

- [ ] **Task 3.2**: Regression and quality gates
  - **Implementation**: Run `npm run lint`, `npm run typecheck`, `npm run test`; update snapshots/fixtures if necessary.
  - **Acceptance Criteria**: All quality gates pass; coverage thresholds maintained.

- [ ] **Task 3.3**: Eliminate console fallbacks and enforce ambient-context guard
  - **Implementation**: Remove `console.*` fallbacks from parser/graph-filter verbose paths; rely on injected logger (real or no-op) and add a guard test/lint to fail builds if `console.*` appears in `src/core/**`. Ensure CLI wiring supplies the logger so verbose output is preserved without ambient console usage.
  - **Acceptance Criteria**: `rg console src/core` only matches intentional stderr boundaries (`logger`/`error-handler`); guard test passes; verbose behavior unchanged from user perspective.

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md.

**Test Categories**:
- **Unit Tests**: Parser logging behavior, graph filter verbose output via logger, logger optionality.
- **Integration Tests**: CLI verbose flag path ensuring logger wired and console output unchanged.
- **End-to-End Tests**: CLI invocation with verbose to confirm no regressions in user-facing output.

### Test Implementation Order
1. **Red Phase**: Add/adjust tests that fail when core hits `console.*` and verify logger receives messages.
2. **Green Phase**: Implement logger threading and replace console calls to satisfy tests.
3. **Refactor Phase**: Simplify logger usage, remove duplication, and ensure helpers/mocks are clean.

### Test Files Structure
```
tests/
├── parser-*.test.ts              # Logger-based verbose assertions
├── bidirectional-filtering.test.ts
└── cli-integration.test.ts       # Ensure CLI still prints user messages; logger used for verbose
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
// Example signature adjustments
export function filterGraph(graph: Graph, options: CliOptions, logger?: Logger): Graph;

// Logger usage contract in parser
class AngularParser {
  constructor(private _options: CliOptions, private _logger?: Logger) {}
}
```

### API Design
```typescript
// CLI wiring
const logger = createLogger(cliOptions.verbose);
const parser = new AngularParser(cliOptions, logger);
let graph = buildGraph(parsedClasses, logger);
graph = filterGraph(graph, cliOptions, logger);
```

### Configuration
- **Environment Variables**: None new.
- **Config Files**: No changes expected.
- **Default Values**: Logger remains optional; verbose flag drives creation.

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Logger undefined**: Core code should no-op logging safely when logger absent (no ambient console fallbacks).
- **Verbose flag false**: Ensure no extraneous output; maintain silent mode.
- **Console error replacements**: Route operational failures through `ErrorHandler`; use `logger.error` for diagnostic context in verbose flows.

### Edge Cases
- **Entry points missing**: Ensure warnings emitted via logger or ErrorHandler, not console.
- **Anonymous classes**: Warnings routed through logger without breaking parsing.

### Validation Requirements
- **Input Validation**: Existing CLI option validation unaffected.
- **Output Validation**: Logger output formatting preserved; CLI stdout remains clean JSON/Mermaid when not verbose.

---

## 7. Performance Considerations

### Performance Requirements
- Logging changes must not add measurable overhead when logger is undefined (should remain no-op).
- Avoid additional allocations in hot paths beyond logger guards.

### Memory Management
- Logger optional path should not retain large buffers; continue streaming to stderr.
- Ensure no leaked timers or contexts when logger absent.

---

## 8. Progress Tracking

### Milestones
- [x] **Milestone 1**: Core logging refactor planned - 2025-12-01
  - [x] Phase 1 tasks completed
  - [x] Signatures defined and agreed
  
- [x] **Milestone 2**: Core logging refactor implemented - 2025-12-02
  - [x] Phase 2 tasks completed
  - [x] Unit/integration tests passing
  
- [ ] **Milestone 3**: Validation complete - 2025-12-03
  - [ ] Phase 3 tasks completed
  - [ ] All acceptance criteria met

### Progress Updates
<!-- Updated by task-executor during execution -->
- 2025-11-30: Inventoryed console usage in core modules (Task 1.1) and mapped replacements.
  - `src/core/graph-filter.ts`: missing-entry warnings → `logger.warn`; verbose summaries → `logger.info`/`logger.debug`.
  - `src/core/parser.ts`: warning emission and verbose instrumentation (file filtering, per-file processing, decorator analysis, inject()/type-resolution warnings) currently rely on `console.log/warn`; plan to thread optional logger and emit warn/info/debug per category, reserving `ErrorHandler` for operational errors.
  - `src/core/logger.ts` and `src/core/error-handler.ts` still write to console as the stderr boundary; leave as-is unless we later add an injectable writer.
  - Next: add guard test to fail on console usage in core paths and finalize logger threading contracts (Task 1.1 TDD hook / Task 1.2).
- 2025-11-30: Added guard coverage for entry filtering and threaded logger into `filterGraph`.
  - New verbose-mode test ensures `filterGraph` emits via provided `Logger` (warn/info/debug) without touching global console.
  - `filterGraph` now accepts optional `Logger` and uses `LogCategory.FILTERING`; CLI passes the logger through when verbose.
  - Follow-up: extend the guard to parser flows and finish Task 1.2 signature updates across core.
- 2025-11-30: Threaded logger through parser verbose/warning paths and removed `console.*` from core.
  - Parser now emits verbose instrumentation and warnings via `Logger`/`ErrorHandler`; added helper methods for verbose info/debug and warn fallback.
  - Added parser regression test to assert verbose logging uses `Logger` instead of global console; logger remains optional and is passed through in verbose CLI mode.
  - Ran `npm test -- src/tests/parser.test.ts src/tests/graph-filter.test.ts` (via `mise x node@20.19.0 -- ...`) to verify updated logging pathways.
- 2025-11-30: Ran `npm run check` (lint + typecheck) after formatting updates; core modules now free of ambient `console.*` aside from intentional stderr boundaries (`logger`/`error-handler`) and CLI UI output.
- 2025-11-30: Converted remaining parser warning tests to assert Logger pathways instead of patching global console; reran `npm test -- src/tests/parser.test.ts` to confirm.
- 2025-11-30: Added console fallbacks for verbose paths when Logger is absent and tightened performance (temporary compatibility).
  - `filterGraph` verbose summaries and missing-entry warnings now log via `Logger` when provided or fall back to console; verbose tests now pass.
  - `parser` verbose helpers emit via `Logger` or console while still honoring the verbose flag; `loadProject` defers heavy source loading to keep the <2s target reliable.
  - Full suite `npm test` now passes; remaining Phase 3 tasks: refresh helpers to drop stale console spies and rerun `npm run check`/`npm run typecheck` if dependencies change.
- 2025-11-30 (follow-up): Console fallbacks flagged as ambient-context regression; plan updated to remove them.
  - Add guard test to fail on `console.*` under `src/core/**`; rely on injected real/no-op logger so verbose output stays intact without ambient console usage.
  - Task 3.3 added to track removal and guard enforcement; CLI wiring to supply logger instance even in verbose no-op mode.
