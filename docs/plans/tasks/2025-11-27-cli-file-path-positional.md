# Implementation Plan Template

**Created by**: task-planner  
**Executed by**: task-executor  
**Date**: 2025-11-27  
**Version**: v0.1  
**Status**: Planning

---

## 1. Overview

### Feature/Task Description
Replace the positional `projectPath` argument with positional `filePaths` that act as a shortcut for `--files`, keeping `--project` as the sole way to set the tsconfig location.

**Goal**: Enable `ng-di-graph [filePaths...] [options]` to target specific files without requiring `--files`, while preserving tsconfig resolution via `--project`.

**Scope**: CLI argument parsing, option mapping into `CliOptions`, parser file target resolution, help/README updates, and regression tests for the new interface; no changes to graph logic or output formats.

**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#6-functional-requirements
- **Related Documentation**: @docs/rules/tdd-development-workflow.md
- **Dependencies**: Commander CLI configuration, `CliOptions` typing, `AngularParser` file filtering, `src/tests/cli-integration.test.ts` fixtures

---

## 2. Technical Approach

### Architecture Decisions
**Design Pattern**: Update Commander configuration to use a variadic positional for file paths and map them into the existing `files` option; merge positional (first) and `--files` inputs with stable deduplication before constructing `CliOptions`.

**Technology Stack**: 
- Commander for CLI parsing
- TypeScript for types and parser integration
- Vitest for CLI parsing/behavior tests

**Integration Points**:
- `src/cli/index.ts`: adjust argument definitions and CLI options construction
- `src/core/parser.ts`: ensure file resolution works with merged `files`
- `src/types/index.ts`: align `CliOptions` documentation/comments if needed
- README/CLI help text to reflect the new usage

### File Structure
```
src/
├── cli/index.ts           # Update argument signature and file mapping
├── types/index.ts         # Confirm CliOptions docs align with positional -> files mapping
└── tests/cli-integration.test.ts  # Expand/adjust CLI parsing and file targeting tests

tests/
└── fixtures/              # Reuse existing fixtures; add only if new cases are required
```

### Data Flow
1. CLI args (`filePaths...`, `--project`, `--files`) → Commander parses.
2. Positional `filePaths` merged with `options.files` (dedup, preserve order) → `CliOptions.files`.
3. `resolveProjectPath` (project-only) normalizes tsconfig directory inputs → `AngularParser`.
4. Parser filters source files using merged `files` list → graph builder/filter → formatter → output handler.

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [ ] **Task 1.1**: Capture desired CLI behavior in tests
  - **TDD Approach**: Add/modify Vitest cases to expect positional file arguments populating `files`, rejecting old positional tsconfig usage, merging with `--files`, and retaining the “no files provided” full-project scan.
  - **Implementation**: Update `src/tests/cli-integration.test.ts` with new parsing and end-to-end expectations, including a regression for the default scan when no file targets are supplied.
  - **Acceptance Criteria**: Failing tests that describe the new interface, highlight deprecated behavior, and lock the default project-scan path.

- [ ] **Task 1.2**: Align docs with planned behavior
  - **TDD Approach**: None (documentation), but note expectations to validate later via help text checks.
  - **Implementation**: Draft README/CLI reference updates to remove positional `projectPath` and show `[filePaths...]`.
  - **Acceptance Criteria**: Docs clearly show new invocation patterns and `--project` requirement for tsconfig.

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 0.5–1 day

- [ ] **Task 2.1**: Update CLI argument parsing
  - **TDD Approach**: Run `npm run test:watch` to drive changes until Task 1 tests pass.
  - **Implementation**: Switch Commander argument to `[filePaths...]`, merge positional and `--files`, keep `--project` default resolution via `resolveProjectPath`, and hard-error when a tsconfig path is provided positionally with guidance to use `--project`.
  - **Acceptance Criteria**: New positional paths populate `CliOptions.files`, legacy positional tsconfig is rejected with actionable messaging (non-zero exit), and existing options remain unchanged.

- [ ] **Task 2.2**: Ensure parser compatibility
  - **TDD Approach**: Extend/adjust parser filtering tests if needed, keeping red/green cycles.
  - **Implementation**: Verify `getTargetSourceFiles` handles merged file inputs (absolute/project-relative) without regression; adjust logging/error text if expectations change.
  - **Acceptance Criteria**: File filtering works with positional inputs; missing files still surface `FILE_NOT_FOUND`.

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.5 day

- [ ] **Task 3.1**: Refresh user-facing help and docs
  - **Implementation**: Update Commander help strings and README usage/CLI reference to show `[filePaths...]` semantics and `--project` usage.
  - **Acceptance Criteria**: Help output and README match implemented behavior; examples use positional files where appropriate.

- [ ] **Task 3.2**: Quality gates and cleanup
  - **Implementation**: Run `npm run lint`, `npm run typecheck`, `npm run test`, and adjust code comments/typing for clarity.
  - **Acceptance Criteria**: All quality checks pass with no regressions.

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md

**Test Categories**:
- **Unit Tests**: CLI parsing logic for positional files vs `--files` merging.
- **Integration Tests**: CLI → parser flow ensuring file filtering respects merged inputs.
- **End-to-End Tests**: Existing CLI integration suite covering help text expectations and the default full-project scan when no file targets are provided.

### Test Implementation Order
1. **Red Phase**: Add failing CLI parsing tests for positional files and legacy positional tsconfig rejection.
2. **Green Phase**: Implement CLI argument changes and parser handling until tests pass.
3. **Refactor Phase**: Clean up option-building helpers, dedup logic, and doc strings.

### Test Files Structure
```
tests/
├── unit/                # (only if new small units are added)
└── cli-integration.test.ts  # primary location for CLI behavior assertions
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
// CliOptions (existing)
interface CliOptions {
  project: string;
  files?: string[]; // populated from positional [filePaths...] ∪ --files
  format: 'json' | 'mermaid';
  entry?: string[];
  direction: 'upstream' | 'downstream' | 'both';
  includeDecorators: boolean;
  out?: string;
  verbose: boolean;
}
```

### API Design
```typescript
program
  .name('ng-di-graph')
  .argument('[filePaths...]', 'TypeScript files to analyze (alias for --files)')
  .option('-p, --project <path>', 'tsconfig.json path', './tsconfig.json')
  // ...
  .action((filePaths: string[] = [], options) => {
    const project = resolveProjectPath(options.project);
    // preserve user order: positional first, then --files, stable dedupe
    const mergedFiles = Array.from(new Set([...filePaths, ...(options.files ?? [])]));
    // throw if mergedFiles contains tsconfig-like input with no other files
  });
```

### Configuration
- **Environment Variables**: None required.
- **Config Files**: Ensure `--project` still accepts directory paths (auto-append tsconfig).
- **Default Values**: `--project ./tsconfig.json`; `files` undefined when no positional/flag provided.

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Legacy positional tsconfig provided**: Hard error with guidance to use `--project <path>`. Detection rule: any positional ending with `tsconfig.json` or `tsconfig.*.json` (case-sensitive). Error message: `Error: Positional argument "<path>" looks like a tsconfig. Use --project "<path>" instead.`
- **File not found after merging positional/flag inputs**: Preserve `FILE_NOT_FOUND` via parser.
- **Directory positional but empty**: Surface `Error: Directory "<path>" contained no matching files.` (non-zero exit).

### Edge Cases
- **Both positional files and `--files`**: Merge and deduplicate; maintain user-provided order (positional first).
- **Directory passed as positional**: Allow if it contains files (mirror existing behavior for `--files`); error with `Error: Directory "<path>" contained no matching files.` when empty.
- **No files specified**: Default to full project scan (current behavior).

### Validation Requirements
- Ensure positional inputs are treated as file paths only.
- Maintain project path resolution for directory inputs via `--project`.

---

## 7. Performance Considerations

### Performance Requirements
- No change to existing parsing complexity; merging file arrays should be O(n).

### Memory Management
- Minimal additional footprint from merged array; no new large allocations.

---

## 8. Progress Tracking

### Milestones
- [ ] **Milestone 1**: Red tests captured - 2025-11-28
  - [ ] CLI integration tests updated to new positional behavior
  - [ ] README draft prepared
  
- [ ] **Milestone 2**: Core CLI change complete - 2025-11-29
  - [ ] Commander argument updated and merged file handling implemented
  - [ ] Parser compatibility validated
  
- [ ] **Milestone 3**: Docs & quality gates - 2025-11-30
  - [ ] Help/README refreshed
  - [ ] Lint/typecheck/test passing

### Progress Updates
**Last Updated**: 2025-11-27  
**Current Status**: Plan drafted; awaiting execution.  
**Blockers**: None identified.  
**Next Steps**: Implement Phase 1 tests and documentation updates.

---

## 9. Definition of Done

### Completion Criteria
- [ ] All implementation tasks completed
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code review completed
- [ ] Performance requirements met
- [ ] Documentation updated
- [ ] No critical bugs or security issues

### Acceptance Testing
- [ ] **Functional Requirements**: CLI accepts positional file paths, rejects positional tsconfig, merges with `--files`.
- [ ] **Non-Functional Requirements**: Behavior aligns with PRD expectations for CLI options.
- [ ] **Edge Cases**: Error messaging for invalid positional inputs verified, default full-project scan retained when no targets are supplied, positional directories allowed when they contain files.

### Code Quality Checks
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes  
- [ ] `npm run test` all tests pass
- [ ] Code coverage meets requirements (≥79% lines/statements, ≥90% functions, ≥67% branches)

---

## 10. Risk Assessment

### High Risk Items
- **Backward compatibility break**: Users accustomed to positional tsconfig will see failures.
  - *Mitigation*: Add explicit hard error with migration guidance; update README and help text prominently.
- **Commander parsing regressions**: Variadic positional could interact with options parsing.
  - *Mitigation*: Expand parsing tests for combined positional/flag inputs.

### Dependencies & Blockers
- **External Dependencies**: None new.
- **Internal Dependencies**: Existing parser file filtering must continue to pass tests after input changes.

### Contingency Plans
- **Plan A**: Enforce new positional behavior with clear errors for legacy usage.
- **Plan B**: If compatibility issues arise, add a deprecation warning path before hard erroring.

---

## 11. Notes & Decisions

### Implementation Notes
- Keep `resolveProjectPath` focused on `--project` (dir or file) and avoid inferring tsconfig from positional args.
- Deduplicate merged file lists to prevent duplicated parsing effort/log noise.
- Maintain verbose logging for filtered file lists for easier troubleshooting.

### Decision Log
- **Decision 1**: Positional arguments now map exclusively to `files`, removing support for positional tsconfig.
- **Decision 2**: Provide user-facing guidance when positional input looks like a tsconfig to ease migration.

### Questions for Executor
- None at this time.

---

## 12. Resources & References

### Documentation
- **Requirements**: @docs/prd/mvp-requirements.md
- **Workflow**: @docs/rules/tdd-development-workflow.md
- **Architecture**: README CLI usage section for current behavior

### External Resources
- Commander.js documentation for variadic arguments

### Code Examples
- Existing file filtering tests in `src/tests/cli-integration.test.ts` as reference for expected behaviors
