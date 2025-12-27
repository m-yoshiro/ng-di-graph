# Implementation Plan: Node Source Location Metadata

**Created by**: implementation-planner  
**Executed by**: implementation-executor  
**Date**: 2025-12-27  
**Version**: v0.1  
**Status**: Planning

---

## 1. Overview

### Feature/Task Description
Add a `source` property to graph nodes that captures the ts-morph file path and
class-name token start position so consumers can navigate back to the declaring file and location.

**Goal**: Propagate class declaration source location into `Graph.nodes`.

**Scope**:
- Extend types (`Node`, `ParsedClass`) with source metadata.
- Extract class-name token line/column data from ts-morph during parsing (1-based).
- Persist source metadata through graph construction and JSON output.
- Update unit tests to cover source propagation.
- Document the JSON schema change for consumers.

**Out of Scope**:
- CLI flag changes or new output formats.
- Mermaid diagram changes.

**Priority**: Medium

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#10
- **Related Documentation**: @docs/rules/tdd-development-workflow.md
- **Dependencies**: ts-morph line/column APIs, existing parser and graph builder.

---

## 2. Technical Approach

### Architecture Decisions
**Design Pattern**: Data enrichment in the parser, propagation through graph builder.

**Technology Stack**:
- TypeScript 5.x, ts-morph, Vitest

**Integration Points**:
- `src/core/parser.ts` provides `ParsedClass.source` (ts-morph file path + class-name token).
- `src/core/graph-builder.ts` copies source into `Node.source`.
- `src/formatters/json-formatter.ts` outputs the updated graph unchanged.

### File Structure
```
src/
├── core/
│   ├── parser.ts           # Extract source location (line/column)
│   └── graph-builder.ts    # Attach source to nodes
├── types/
│   └── index.ts            # NodeSource, Node, ParsedClass updates
└── tests/
    ├── parser.test.ts      # Source location extraction tests
    └── graph-builder.test.ts # Source propagation tests
tests/
└── formatters.test.ts      # JSON output assertion
README.md                   # JSON schema update note
```

### Data Flow
1. Source files → `AngularParser.parseClassDeclaration` → `ParsedClass.source`
2. `buildGraph(parsedClasses)` → `Node.source`
3. `JsonFormatter.format(graph)` → JSON output includes `source`

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [ ] **Task 1.1**: Extend core types with source metadata
  - **TDD Approach**: Add type-level tests or update existing fixtures to fail without
    `source` propagation.
  - **Implementation**: Add `NodeSource` interface, `Node.source?: NodeSource`,
    `ParsedClass.source: NodeSource`, keep `ParsedClass.filePath` for compatibility.
  - **Acceptance Criteria**: Types compile and existing tests fail only where
    `source` is now expected.

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 1 day

- [ ] **Task 2.1**: Extract class-name token location in parser
  - **TDD Approach**: Add a failing test in `src/tests/parser.test.ts` that asserts
    line/column for a known class-name token and asserts `source.filePath` matches
    `ParsedClass.filePath`.
  - **Implementation**: Use `classDeclaration.getNameNode()` and
    `sourceFile.getLineAndColumnAtPos(nameNode.getStart())` to populate
    `ParsedClass.source`. Set `source.filePath` to `filePath` (ts-morph absolute path).
  - **Acceptance Criteria**: Parser test passes with correct line/column (1-based)
    and `source.filePath === filePath`.

- [ ] **Task 2.2**: Propagate source metadata to graph nodes
  - **TDD Approach**: Add a failing test in `src/tests/graph-builder.test.ts` that
    verifies `Node.source` for known classes and omission for unknown nodes.
  - **Implementation**: Copy `parsedClass.source` into `Node.source` when creating
    nodes. Leave unknown nodes without `source`.
  - **Acceptance Criteria**: Graph builder tests pass, unknown node sources omitted.

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.5 day

- [ ] **Task 3.1**: Validate JSON output retains source metadata
  - **TDD Approach**: Add a failing test in `tests/formatters.test.ts` to assert JSON
    includes `source` with `filePath` matching the node's `filePath`.
  - **Implementation**: No formatter changes needed; verify output structure.
  - **Acceptance Criteria**: JSON output includes `source` for known nodes.

- [ ] **Task 3.2**: Update documentation for JSON schema change
  - **Implementation**: Note the `nodes[].source` shape and semantics in `README.md`.
  - **Acceptance Criteria**: README documents the new `source` field.

- [ ] **Task 3.3**: Run quality gates
  - **Implementation**: `npm run lint`, `npm run typecheck`, `npm run test`, and
    `npm run build`.
  - **Acceptance Criteria**: All commands succeed on Node 20.x.

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from
@docs/rules/tdd-development-workflow.md using `npm run test:watch`.

**Test Categories**:
- **Unit Tests**: Parser source extraction, graph builder propagation.
- **Integration Tests**: Formatter JSON output validation.

### Test Implementation Order
1. **Red Phase**: Parser test for line/column and graph builder test for source
   propagation.
2. **Green Phase**: Implement `ParsedClass.source` extraction and node propagation.
3. **Refactor Phase**: Clean up shared fixtures or helpers if needed.

### Test Files Structure
```
src/tests/
├── parser.test.ts
└── graph-builder.test.ts
tests/
└── formatters.test.ts
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
export interface NodeSource {
  filePath: string; // ts-morph absolute path
  line: number;
  column: number;
}

export interface Node {
  id: string;
  kind: NodeKind;
  source?: NodeSource;
}

export interface ParsedClass {
  name: string;
  kind: NodeKind;
  filePath: string;
  source: NodeSource; // class-name token start position
  dependencies: ParsedDependency[];
}
```

### API Design
No new public API surface; JSON output includes the new `source` field.

### Configuration
- **Environment Variables**: None
- **Config Files**: None
- **Default Values**: `Node.source` omitted for unknown nodes.

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Missing class name**: Existing parser behavior skips anonymous classes entirely.
- **Missing name node**: Treat as anonymous and skip; do not emit partial `ParsedClass`.

### Edge Cases
- **Unknown nodes**: Do not attach `source`.
- **Multiple decorators**: Use class-name token location regardless of decorator order.
- **Anonymous classes**: Skipped, never emitted without `source`.

### Validation Requirements
- **Input Validation**: Ensure `ParsedClass.source` is present for named classes.
- **Output Validation**: `Node.source` present only when parser provided it.

---

## 7. Performance Considerations

### Performance Requirements
- **Target Metrics**: Negligible overhead (<1% parsing time).
- **Bottlenecks**: None expected; line/column lookup is O(1).
- **Optimization Strategy**: Avoid additional AST traversals.

### Memory Management
- **Memory Usage**: Small increase per node for source metadata.
- **Large Dataset Handling**: Keep `source` optional to minimize unknown node size.

---

## 8. Progress Tracking

### Milestones
- [ ] **Milestone 1**: Foundation Complete - 2025-12-30
  - [ ] Types updated and compile
  - [ ] Initial failing tests written

- [ ] **Milestone 2**: Core Implementation Complete - 2026-01-02
  - [ ] Parser and graph builder tests passing

- [ ] **Milestone 3**: Feature Complete - 2026-01-03
  - [ ] All tests and quality gates passing
  - [ ] JSON output validated

### Progress Updates
<!-- Updated by implementation-executor during execution -->

---

## 9. Definition of Done

- `Node.source` and `ParsedClass.source` are implemented and documented in types.
- Parser populates `source` with class-name token position (1-based line/column).
- `source.filePath` matches `ParsedClass.filePath` (ts-morph absolute path).
- Graph builder propagates `source` for known nodes and omits it for unknown nodes.
- Tests added/updated per TDD workflow; `npm run test` passes.
- `npm run lint`, `npm run typecheck`, and `npm run build` succeed.
- README documents the JSON schema change.
