# Implementation Plan Template

**Created by**: task-planner  
**Executed by**: task-executor  
**Date**: 2025-11-24  
**Version**: v0.1  
**Status**: In Progress

---

## 1. Overview

### Feature/Task Description
Allow `ng-di-graph -p <tsconfig>` to accept TypeScript configs that contain JSON comments (JSONC) instead of failing early on JSON.parse.

**Goal**: Ensure `--project` loading succeeds with standard TypeScript-allowed config syntax (comments, trailing commas) while retaining clear errors for genuinely invalid configs.

**Scope**: Update tsconfig parsing/validation in `AngularParser.loadProject`, adjust error handling, and add regression tests using fixtures like `src/tests/fixtures/tsconfig-with-comment.json`. Excludes broader CLI option changes.

**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#fr‑01
- **Related Documentation**: @docs/rules/tdd-development-workflow.md
- **Dependencies**: TypeScript config parsing semantics; ts-morph project loading uses the resolved config.

---

## 2. Technical Approach

### Architecture Decisions
Use TypeScript’s tolerant config parser in two stages (`ts.readConfigFile` then `ts.parseJsonConfigFileContent`) to validate configs instead of strict `JSON.parse`, preserving existing error pathways for invalid files and aggregating diagnostics from both stages.

**Design Pattern**: Centralized validation inside `AngularParser.loadProject` with existing CliError mapping; no new pattern introduced.

**Technology Stack**:
- TypeScript compiler API (config parsing helpers: `readConfigFile`, `parseJsonConfigFileContent`)
- ts-morph Project loading (unchanged)
- Vitest for regression tests

**Integration Points**:
- `src/core/parser.ts` config validation prior to Project creation
- Tests in `tests/parser.test.ts` (and fixtures under `src/tests/fixtures/`)

### File Structure
```
src/
├── core/
│   └── parser.ts        # replace JSON.parse with TS config parser (readConfigFile + parseJsonConfigFileContent); preserve error mapping
└── tests/
    └── fixtures/
        └── tsconfig-with-comment.json  # reuse for regression

tests/
├── parser.test.ts       # regression ensuring comment configs load and diagnostics formatted
└── cli-integration.test.ts # end-to-end coverage for CLI -p with comments
```

### Data Flow
1. CLI resolves `--project` path → `AngularParser.loadProject`.
2. Parse JSONC text via `ts.readConfigFile` (handles comments/trailing commas) → collect syntax diagnostics.
3. Normalize/validate options with `ts.parseJsonConfigFileContent` (resolves `extends`) → collect semantic diagnostics.
4. On success, pass validated path to `ts-morph` `Project` → program/diagnostics → downstream graph parsing.

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [ ] **Task 1.1**: Add failing regression test for tsconfig with comments.
  - **TDD Approach**: In `tests/parser.test.ts`, create a new test case that attempts to load `src/tests/fixtures/tsconfig-with-comment.json`.
  - **Implementation**: Test should initially fail because current JSON.parse rejects comments (throws `TSCONFIG_INVALID`), establishing the Red phase.
  - **Acceptance Criteria**: New test fails pre-change; documents expected error.

- [ ] **Task 1.2**: Confirm fixture coverage.
  - **TDD Approach**: Validate fixture path usage and prepare any temporary copy in tmp dir if needed.
  - **Implementation**: Ensure fixture remains JSONC with comments; no format changes.
  - **Acceptance Criteria**: Fixture is referenced by tests without modification.

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [ ] **Task 2.1**: Replace strict JSON.parse with TS config parser.
  - **TDD Approach**: Run failing test; implement minimal changes to make it pass.
  - **Implementation**: Use `ts.readConfigFile` + `ts.parseJsonConfigFileContent` to parse/validate; collect diagnostics; map any diagnostics to `TSCONFIG_INVALID` with formatted messages. Continue to load `ts-morph` Project afterward.
  - **Acceptance Criteria**: Regression test passes; other parser tests remain green.

- [ ] **Task 2.2**: Preserve/adjust error messaging and diagnostic formatting.
  - **TDD Approach**: Add/extend tests for malformed config (still invalid) to ensure errors are clear.
  - **Implementation**: Add helper to aggregate TS diagnostics from both `readConfigFile` (single error) and `parseJsonConfigFileContent` (diagnostics array) into a concise multi-line string for `CliError`; ensure malformed JSONC still surfaces `Invalid tsconfig.json` with diagnostic text.
  - **Acceptance Criteria**: Existing malformed-config tests continue to pass; messages stay informative.

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.25 day

- [ ] **Task 3.1**: CLI integration test for `-p` with commented config.
  - **Implementation**: Add coverage in `tests/cli-integration.test.ts` to run CLI with `--project src/tests/fixtures/tsconfig-with-comment.json`.
  - **Acceptance Criteria**: CLI arg path resolves and runs without config parse errors.

- [ ] **Task 3.2**: Quality checks.
  - **Implementation**: Run `npm run lint`, `npm run typecheck`, and `npm run test`.
  - **Acceptance Criteria**: All commands pass; no regressions.

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md.

**Test Categories**:
- **Unit Tests**: Parser config validation behavior in `tests/parser.test.ts`.
- **Integration Tests**: CLI handling of `--project` with JSONC config.
- **End-to-End Tests**: Not required for this scope.

### Test Implementation Order
1. **Red Phase**: Add failing parser regression for comment-bearing tsconfig.
2. **Green Phase**: Swap to TS config parser until test passes.
3. **Refactor Phase**: Add diagnostic formatting helper; ensure messages are concise.

### Test Files Structure
```
tests/
├── parser.test.ts              # primary regression
└── cli-integration.test.ts     # CLI -p JSONC coverage
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
// Config parsing helper result structure
type ConfigParseResult = {
  config?: unknown;
  errorMessage?: string; // aggregated diagnostics text
};
```

### API Design
```typescript
class AngularParser {
  public loadProject(): void {
    // read tsconfig text
    // parse via ts compiler API allowing comments
    // throw CliError on diagnostics
    // initialize ts-morph Project
  }
}
```

### Configuration
- **Config Files**: `--project` should accept JSONC syntax; invalid configs still raise `TSCONFIG_INVALID`.
- **Default Values**: None changed.

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Malformed Config**: Diagnostics from TS parser should map to `TSCONFIG_INVALID` with aggregated message text.
- **Missing File**: Existing `TSCONFIG_NOT_FOUND` path remains unchanged.
- **Compiler Option Errors**: Preserve current `PROJECT_LOAD_FAILED`/`COMPILATION_ERROR` mapping.

### Edge Cases
- **Trailing commas / comments**: Must succeed.
- **Empty config file**: Should return invalid with clear message.
- **Invalid extends resolution**: Should surface aggregated diagnostics from `parseJsonConfigFileContent`.

### Validation Requirements
- **Input Validation**: Validate config text through TS parser before Project creation.
- **Output Validation**: Maintain informative errors surfaced to CLI.

---

## 7. Performance Considerations

### Performance Requirements
- Keep config parsing O(file size); TS parser overhead negligible.
- Avoid double parsing where possible.

### Memory Management
- Minimal additional memory; reuse file content buffer.
- Large configs should still parse within existing constraints.

---

## 8. Progress Tracking

### Milestones
- [x] **Milestone 1**: Regression Captured - 2025-11-24
  - [x] Tests failing for JSONC config
  - [x] Fixture referenced in tests
  
- [x] **Milestone 2**: Parser Updated - 2025-11-24
  - [x] TS config parser integrated
  - [x] All parser tests passing
  
- [ ] **Milestone 3**: Validation Complete - 2025-11-25
  - [x] CLI integration test added/passing
  - [ ] Lint/typecheck/test passing

### Progress Updates
**Last Updated**: 2025-11-24  
**Current Status**: Parser now uses TS config parser; JSONC regression and CLI integration tests are green. Quality gates still pending.  
**Blockers**: None identified.  
**Next Steps**: Run lint/typecheck/full test suite; verify outputs remain stable.

---

## 9. Definition of Done

### Completion Criteria
- [ ] All implementation tasks completed
- [ ] All tests passing (unit, integration)
- [ ] Code review completed
- [ ] No regression in tsconfig error handling
- [ ] Documentation updated if CLI behavior changes
- [ ] No critical bugs or security issues

### Acceptance Testing
- [ ] **Functional Requirements**: `--project` accepts JSONC configs without errors.
- [ ] **Non-Functional Requirements**: No performance regression.
- [ ] **Edge Cases**: Trailing commas/comments handled; malformed configs still error clearly.

### Code Quality Checks
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes  
- [ ] `npm run test` all tests pass
- [ ] Code coverage meets requirements (>70%)

---

## 10. Risk Assessment

### High Risk Items
- **TS Parser Diagnostics Format**: Messages may differ from JSON.parse; need to ensure user-friendly output via aggregator.
- **Silent Parsing Differences**: TS parser might coerce some invalid constructs; must ensure diagnostics are checked from both readConfigFile and parseJsonConfigFileContent.

### Dependencies & Blockers
- **External Dependencies**: TypeScript API availability (already in devDeps).
- **Internal Dependencies**: Existing error-handler expectations and tests.

### Contingency Plans
- **Plan A**: Use `ts.readConfigFile` + `ts.parseJsonConfigFileContent`.
- **Plan B**: Use `ts.parseConfigFileTextToJson` fallback with manual validation if diagnostics mismatch expectations.

---

## 11. Notes & Decisions

### Implementation Notes
- Keep CliError codes unchanged; only adjust parsing mechanism.
- Add diagnostic-to-string helper to aggregate TS diagnostics (readConfigFile error + parseJsonConfigFileContent diagnostics) for user-friendly errors.

### Decision Log
- **Decision 1**: Favor TypeScript config parser to support JSONC syntax.
- **Decision 2**: Add regression test before code change to follow TDD.
- **Decision 3**: Make CLI integration test for JSONC mandatory for end-to-end coverage.
- **Decision 4**: Aggregate diagnostics into multi-line messages for user-friendly errors.

### Questions for Executor
- None; plan assumes CLI integration test and aggregated diagnostics.

---

## 12. Resources & References

### Documentation
- **Requirements**: @docs/prd/mvp-requirements.md
- **Workflow**: @docs/rules/tdd-development-workflow.md

### External Resources
- TypeScript `readConfigFile` / `parseJsonConfigFileContent` docs
- ts-morph project loading reference

### Code Examples
- Existing parser tests for malformed configs in `tests/parser.test.ts`
- ts-morph initialization in `src/core/parser.ts`
