# Implementation Plan Template

**Created by**: implementation-planner  
**Executed by**: task-executor  
**Date**: 2025-12-28  
**Version**: v0.1  
**Status**: Planning

---

## 1. Overview

### Feature/Task Description
Hide nodes and edges that originate from `@angular/core` (for example, `ElementRef`) by default,
while providing a CLI flag to include them when needed.

**Goal**: Reduce noisy framework nodes so users focus on project-owned modules.

**Scope**:  
- Add a CLI option to include Angular core nodes on demand.  
- Track whether dependency tokens come from `@angular/core`.  
- Filter graph output to exclude Angular core nodes by default.  
- Support namespace imports from `@angular/core` (e.g., `import * as core from '@angular/core'`).  
- Keep output schema unchanged (origin metadata remains internal).
- Update tests and docs.
- Document known limitation: re-exported `@angular/core` symbols are not detected in the first cut.

**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#11-cli-interface
- **Related Documentation**: @docs/rules/tdd-development-workflow.md, @docs/testing/test-structure.md
- **Dependencies**: Parser token resolution, graph construction, output formatting

---

## 2. Technical Approach

### Architecture Decisions
**Design Pattern**: Pipeline stage filter based on node origin. Track origin during parsing and
filter at graph output; keep formatters schema-stable by omitting origin in output.

**Technology Stack**:
- TypeScript, ts-morph
- Vitest for tests
- Biome for lint and format

**Integration Points**:
- `src/cli/index.ts` for CLI option wiring and defaults
- `src/core/parser.ts` to tag dependencies that come from `@angular/core` (named + namespace)
- `src/core/graph-builder.ts` to propagate origin into graph nodes
- `src/core/graph-filter.ts` or `src/core/output-handler.ts` to remove Angular core nodes
- `src/formatters/json-formatter.ts` to preserve the JSON output schema (omit origin)

### File Structure
```
src/
├── cli/
│   └── index.ts (add CLI option)
├── core/
│   ├── parser.ts (detect angular/core imports for dependencies)
│   ├── graph-builder.ts (propagate origin)
│   └── graph-filter.ts (filter angular/core nodes)
├── formatters/
│   └── json-formatter.ts (omit origin from output)
├── types/
│   └── index.ts (origin type + option)

tests/
├── src/tests/parser.test.ts (parser origin tagging)
├── src/tests/graph-builder.test.ts (origin propagation)
├── src/tests/formatters.test.ts (output excludes angular/core by default)
└── tests/cli/cli-integration.test.ts (flag behavior)
```

### Data Flow
1. Parse classes and dependencies -> tag dependency origin.
2. Build graph -> attach origin to nodes.
3. Filter graph -> drop angular/core nodes unless flag set.
4. Format output -> omit origin metadata to keep output schema stable.

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 0.5-1 day

- [ ] **Task 1.1**: Define node origin and CLI option
  - **TDD Approach**: Add failing tests for CLI default behavior and option parsing.
  - **Implementation**: Extend `CliOptions` with `includeAngularCore` (default false).
  - **Acceptance Criteria**: CLI options parsed with default exclude behavior.

- [ ] **Task 1.2**: Add origin fields to core types
  - **TDD Approach**: Add failing tests for origin propagation in graph nodes.
  - **Implementation**: Introduce `NodeOrigin` type and add `origin` to `Node` and
    `ParsedDependency`.
  - **Acceptance Criteria**: Types compile and tests assert presence of origin.

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 1-2 days

- [ ] **Task 2.1**: Tag dependencies imported from `@angular/core`
  - **TDD Approach**: Add parser tests for `ElementRef`, aliased imports
    (`import { ElementRef as CoreElementRef } from '@angular/core'`), and namespace imports
    (`import * as core from '@angular/core'` with `core.ElementRef`).
  - **Implementation**: Build a per-file import map (named + namespace) and mark dependencies as
    `angular-core` when matched.
  - **Acceptance Criteria**: Dependencies are tagged correctly for direct, aliased, and namespace imports.

- [ ] **Task 2.2**: Propagate dependency origin into unknown nodes
  - **TDD Approach**: Add graph-builder tests where dependency origin yields node origin.
  - **Implementation**: When creating unknown nodes, apply dependency origin instead of default.
  - **Acceptance Criteria**: Graph nodes include origin in output structure.

- [ ] **Task 2.3**: Filter angular/core nodes by default
  - **TDD Approach**: Add graph filter tests for default exclusion and flag inclusion.
  - **Implementation**: Apply a filter that removes nodes and edges with origin
    `angular-core` when `includeAngularCore` is false. Update circular dependency filtering too.
  - **Acceptance Criteria**: Output excludes Angular core nodes by default and preserves them
    when the flag is set.

- [ ] **Task 2.4**: Preserve output schema
  - **TDD Approach**: Add formatter tests to ensure JSON output omits `origin`.
  - **Implementation**: Strip origin metadata before formatting (or in JSON formatter only).
  - **Acceptance Criteria**: JSON output remains aligned with @docs/prd/mvp-requirements.md#9-output-specification.

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.5-1 day

- [ ] **Task 3.1**: Update docs and CLI help text
- [ ] **Task 3.1a**: Document known limitation (re-exports) and note future fix via symbol tracing
- [ ] **Task 3.2**: Run lint, typecheck, tests, and build for validation

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md

**Test Categories**:
- **Unit Tests**: Parser origin tagging (named/alias/namespace), graph builder origin propagation,
  graph filter exclusion
- **Integration Tests**: CLI output with and without `--include-angular-core`
- **End-to-End Tests**: Ensure formatters emit identical structure except for filtered nodes and
  do not expose origin metadata
- **Targeted Cases**: Cycle that includes an angular-core node (filtering keeps cycle output
  stable) and an alias-path fixture when `tsconfig` maps `@angular/core`.

### Test Implementation Order
1. **Red Phase**: Add failing tests for default exclusion and flag inclusion.
2. **Green Phase**: Implement origin tagging and filtering until tests pass.
3. **Refactor Phase**: Consolidate import mapping helpers and remove duplication.
4. **Safety Tests**: Add cycle-includes-angular and alias-path tests once core behavior is green.

### Test Files Structure
```
src/tests/
├── parser.test.ts
├── graph-builder.test.ts
└── graph-filter.test.ts

tests/cli/
└── cli-integration.test.ts
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
export type NodeOrigin = 'project' | 'angular-core' | 'external';

export interface Node {
  id: string;
  kind: NodeKind;
  origin: NodeOrigin; // Internal metadata, omitted from output
  source?: NodeSource;
}

export interface ParsedDependency {
  token: string;
  flags?: EdgeFlags;
  parameterName: string;
  origin?: NodeOrigin;
}

export interface CliOptions {
  // ...
  includeAngularCore: boolean;
}
```

### API Design
```typescript
// CLI flag
// --include-angular-core
```

### Configuration
- **Default Values**: `includeAngularCore = false`

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Scenario 1**: Namespace import from `@angular/core` not mapped correctly (origin tagging fails).
- **Scenario 2**: Aliased imports or renamed tokens (ensure alias mapping works).
- **Scenario 3**: `tsconfig` path aliases map to `@angular/core`, causing string-based import
  detection to miss Angular core symbols.

### Edge Cases
- **Edge Case 1**: `@Inject` string tokens should not be tagged as angular/core.
- **Edge Case 2**: Multiple imports from `@angular/core` across files in monorepo fixtures.
- **Edge Case 3**: Re-exported Angular core tokens (documented limitation for first cut).
- **Edge Case 4**: Cycles that include an Angular core node (filtering must not corrupt cycle
  detection output).

### Validation Requirements
- **Input Validation**: CLI flag parsing and default values.
- **Output Validation**: Filter removes nodes and related edges, circular deps updated.

---

## 7. Performance Considerations

### Performance Requirements
- **Target Metrics**: No measurable regression on existing parser timings.
- **Bottlenecks**: Re-scanning import declarations for every parameter.
- **Optimization Strategy**: Cache import maps per source file.

### Memory Management
- **Memory Usage**: Minimal overhead for per-file import map cache.
- **Large Dataset Handling**: Avoid per-parameter import lookups without caching.

---

## 8. Known Limitations (First Cut)

- Re-exported `@angular/core` symbols are not detected and may appear as project nodes.
- Symbol-tracing (via type checker) is the planned follow-up to close these gaps.

---

## 9. Progress Tracking

### Milestones
- [ ] **Milestone 1**: Foundation Complete - 2025-12-30
  - [ ] All Phase 1 tasks completed
  - [ ] Basic tests passing

- [ ] **Milestone 2**: Core Implementation Complete - 2026-01-02
  - [ ] All Phase 2 tasks completed
  - [ ] Integration tests passing

- [ ] **Milestone 3**: Feature Complete - 2026-01-03
  - [ ] All phases completed
  - [ ] All acceptance criteria met

### Progress Updates
- 2025-12-28: Added alias fixture and initial tests for angular-core cycle filtering and
  alias-path origin tagging (expected to fail until implementation).
- 2025-12-28: Implemented angular-core origin tagging (with tsconfig alias support), origin
  propagation for unknown nodes, CLI flag wiring, and default angular-core filtering.

---

## 10. Definition of Done

- [ ] CLI defaults to excluding `@angular/core` nodes with a documented opt-in flag.
- [ ] Parser tags dependency origin accurately for direct and aliased imports.
- [ ] Parser tags dependency origin accurately for namespace imports.
- [ ] Graph builder propagates origin and filter removes nodes and edges accordingly.
- [ ] JSON output excludes origin metadata and matches the documented schema.
- [ ] Tests pass: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- [ ] Documentation updated to describe the new flag and default behavior.
