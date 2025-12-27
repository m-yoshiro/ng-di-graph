# Implementation Plan Template

**Created by**: task-planner  
**Executed by**: task-executor  
**Date**: 2025-12-27  
**Version**: v0.1  
**Status**: In Progress

---

## 1. Overview

### Feature/Task Description
Introduce a new human-readable text output format (Option A) and make it the default CLI output, while keeping JSON and Mermaid formats available via `--format`.

**Goal**: Provide a concise, readable default output that summarizes the graph, highlights dependency relationships, and calls out warnings/cycles.

**Scope**: Add a text formatter, update CLI format validation and defaults, expose parser summary data needed for text output, and update tests/docs to reflect the new default.

**Priority**: Medium

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#6-functional-requirements (FR-05, FR-06, FR-08, FR-11)
- **Related Documentation**: @docs/plans/tasks/task-2.2-output-formatting.md, @docs/rules/tdd-development-workflow.md
- **Dependencies**: Existing formatters (`JsonFormatter`, `MermaidFormatter`), CLI option parsing, parser warning tracking

---

## 2. Technical Approach

### Architecture Decisions
**Design Pattern**: Strategy (formatters) to add `TextFormatter` without changing existing JSON/Mermaid behavior.

**Technology Stack**:
- TypeScript
- Existing logger and parser warning aggregation

**Integration Points**:
- `src/cli/index.ts` for format option validation and default
- `src/types/index.ts` for `CliOptions` format type
- `src/formatters/` for new formatter
- `src/core/parser.ts` for warning counts and file stats exposure

### File Structure
```
src/
├── formatters/
│   ├── json-formatter.ts
│   ├── mermaid-formatter.ts
│   └── text-formatter.ts
├── core/
│   └── parser.ts
├── cli/
│   └── index.ts
└── types/
    └── index.ts

src/tests/
├── formatters.test.ts
└── cli-integration.test.ts
```

### Data Flow
1. CLI parses options and builds graph.
2. Parser exposes structured warning counts and file stats.
3. Text formatter computes summary + top providers from graph and stats.
4. Output handler writes formatted text to stdout or file.

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 1 day

- [x] **Task 1.1**: Define text output spec and tests
  - **TDD Approach**: Add unit tests in `src/tests/formatters.test.ts` for:
    - Summary counts (files, warnings, cycles)
    - Dependency grouping/formatting and limit
    - Empty graph behavior
  - **Implementation**: Create test fixtures that include unknown nodes, circular dependencies, and warnings.
  - **Acceptance Criteria**: Tests fail until formatter exists and output matches the spec below.

- [x] **Task 1.2**: Expose parser summary data for text output
  - **TDD Approach**: Add tests in `src/tests/parser.test.ts` verifying file counts and warning count accessors.
  - **Implementation**: Store file processing stats in `AngularParser` and expose via a new method (ex: `getProcessingStats()`).
  - **Acceptance Criteria**: Tests pass and stats are accessible without altering parse behavior.

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 1 day

- [x] **Task 2.1**: Implement `TextFormatter`
  - **TDD Approach**: Make formatter tests pass with minimal formatting logic first, then refactor.
  - **Implementation**:
    - New `src/formatters/text-formatter.ts`.
    - Compute counts:
      - Injectables: nodes where `kind !== 'unknown'`
      - Tokens: nodes where `kind === 'unknown'`
      - Warnings: `StructuredWarnings.totalCount`
      - Cycles: `graph.circularDependencies.length`
    - Compute dependency groups from unique edges, limit to 10, sorted by `from` then `to`.
  - **Acceptance Criteria**: Formatter outputs stable, deterministic text (per spec), ends with newline, and logs performance when logger is enabled.

- [x] **Task 2.2**: Update CLI option handling and types
  - **TDD Approach**: Add CLI integration tests for default format and `--format text`.
  - **Implementation**:
    - Update `CliOptions.format` to `'json' | 'mermaid' | 'text'`.
    - Change `--format` default to `text` in `src/cli/index.ts`.
    - Update format validation error messages to include `text`.
    - Instantiate `TextFormatter` with parser stats (processed/skipped file counts + warning totals).
  - **Acceptance Criteria**: CLI uses text output by default and JSON/Mermaid remain available.

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.5-1 day

- [x] **Task 3.1**: Update documentation and help text
  - **TDD Approach**: Update snapshot/help expectations in tests where applicable.
  - **Implementation**: Adjust README and CLI help text to show `text` as default.
  - **Acceptance Criteria**: Docs match actual behavior and tests validate help output.

- [x] **Task 3.2**: Update downstream tests
  - **TDD Approach**: Re-run `npm run test:watch` focusing on CLI and formatter suites.
  - **Implementation**: Update fixtures and expectations referencing default JSON output.
  - **Acceptance Criteria**: All tests pass, no regressions in JSON/Mermaid outputs.

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md

**Test Categories**:
- **Unit Tests**: `TextFormatter` output and parser stats accessors.
- **Integration Tests**: CLI default format selection and `--format text`.
- **End-to-End Tests**: Existing CLI integration suites should still pass with updated defaults.

### Test Implementation Order
1. **Red Phase**: Add formatter tests + CLI default format tests.
2. **Green Phase**: Implement formatter and CLI changes to satisfy tests.
3. **Refactor Phase**: Normalize formatting and shared helpers for summary calculation.

### Test Files Structure
```
src/tests/
├── formatters.test.ts
├── parser.test.ts
└── cli-integration.test.ts
```

---

## 5. Technical Specifications

### Text Output Spec (Option A)
```text
Project: <tsconfig path>
Scope: direction=<direction>, entry=<entry>
Files: <processed> (skipped: <skipped>)
Warnings: <warnings>
Circular dependencies: <cycles>

Dependencies (A depends on B):
Grid
└─ ElementRef

GridRow
├─ ElementRef
└─ Grid

GridCell
├─ ElementRef
└─ GRID_ROW

GridCellWidget
├─ ElementRef
└─ GRID_CELL
```

Notes:
- Use `entry=all` when no entry points are provided.
- When multiple entry points are provided, join them with `, `.
- Omit the `Warnings:` line when `<warnings>` is 0.
- Omit the `Circular dependencies:` line when `<cycles>` is 0.
- Omit the dependency section when there are no edges.
- Only the first 10 unique relationships are shown, sorted by `from` then `to`.
- Always end output with a trailing newline.

### Interfaces & Types
```typescript
export type OutputFormat = 'json' | 'mermaid' | 'text';

export interface TextFormatContext {
  projectPath?: string;
  direction?: 'upstream' | 'downstream' | 'both';
  entry?: string[];
  processedFileCount?: number;
  skippedFileCount?: number;
  warningCount?: number;
  warnings?: Warning[];
  circularDependencyCount?: number;
}
```

### API Design
```typescript
class TextFormatter {
  constructor(context: TextFormatContext, logger?: Logger);
  public format(graph: Graph): string;
}
```

### Configuration
- **Config Files**: None
- **Default Values**: `--format text`

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Scenario 1**: No graph nodes (empty project) -> output still shows header and zero counts.
- **Scenario 2**: No warnings -> omit warnings line entirely.
- **Scenario 3**: No cycles -> omit circular dependency line entirely.

### Edge Cases
- **Edge Case 1**: Large graphs -> only the first 10 dependency relationships are listed to keep output readable.
- **Edge Case 2**: Deterministic ordering -> relationships sorted by `from` then `to`.

### Validation Requirements
- **Input Validation**: Accept only `json`, `mermaid`, `text` for `--format`.
- **Output Validation**: Ensure text output ends with a newline for CLI friendliness.

---

## 7. Performance Considerations

### Performance Requirements
- **Target Metrics**: Output generation remains O(n log n) or better.
- **Bottlenecks**: Sorting providers on very large graphs.
- **Optimization Strategy**: Limit sorting to top N providers; use maps for degree counts.

### Memory Management
- **Memory Usage**: Reuse computed counts without copying large arrays.
- **Large Dataset Handling**: Avoid storing full warning lists in formatter beyond what is needed for output.

---

## 8. Progress Tracking

### Milestones
- [x] **Milestone 1**: Foundation Complete - 2025-12-30
  - [x] All Phase 1 tasks completed
  - [x] Formatter tests failing as expected
  
- [x] **Milestone 2**: Core Implementation Complete - 2026-01-02
  - [x] All Phase 2 tasks completed
  - [x] Unit and CLI integration tests passing
  
- [x] **Milestone 3**: Feature Complete - 2026-01-03
  - [x] All phases completed
  - [x] All acceptance criteria met

### Progress Updates
<!-- Updated by task-executor during execution -->
- 2025-12-27: Task 1.1 completed with failing TextFormatter tests (summary counts, relationships, empty graph).
- 2025-12-27: Task 1.2 completed with parser processing stats accessor and tests.
- 2025-12-27: Task 2.1 completed with TextFormatter implementation + logging.
- 2025-12-27: Task 2.2 completed with CLI defaults, text format tests, and type updates.
- 2025-12-27: Switched dependency section to tree-style output (A depends on B) in spec/tests/formatter.
- 2025-12-27: Dropped token annotations from dependency tree output.
- 2025-12-27: Replaced summary header with Project/Scope context lines.
- 2025-12-27: Removed Nodes/Edges lines from the summary section.
- 2025-12-27: Updated README/PRD/testing docs to reflect text default and help output.
