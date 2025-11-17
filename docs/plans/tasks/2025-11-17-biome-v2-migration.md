# Implementation Plan Template

**Created by**: implementation-planner  
**Executed by**: task-executor  
**Date**: 2025-11-17  
**Version**: v0.1  
**Status**: Planning

---

## 1. Overview

### Feature/Task Description
Migrate the project’s Biome toolchain (linter/formatter) from v1.8 to the latest v2 release, updating dependencies, configuration, docs, and validation workflows.

**Goal**: Adopt Biome v2 to gain the new lint/format capabilities, keep tooling current, and ensure the CLI quality gates run on supported versions.

**Scope**: Includes dependency upgrades, `biome.json` schema/rule updates, script validation, workflow/documentation refresh, and verification runs. Excludes adding new lint rules beyond v2 defaults unless needed for compatibility.

**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#quality-and-tooling-compliance
- **Related Documentation**: @docs/rules/tdd-development-workflow.md, AGENTS.md, CONTRIBUTING.md, docs/testing/test-structure.md
- **Dependencies**: Requires Biome v2 release notes, Bun/NPM lock refresh, coordination with CI commands that invoke Biome.

---

## 2. Technical Approach

### Architecture Decisions

**Design Pattern**: Incremental tooling migration—update dependency and config first, validate locally, then propagate doc changes and CI guidance.

**Technology Stack**: 
- Biome v2 CLI (`@biomejs/biome`)
- Bun/NPM for dependency management
- TypeScript project configured via `tsconfig.json`

**Integration Points**:
- `package.json` scripts (`lint`, `lint:fix`, `format`, `check`)
- Documentation referencing linting commands
- CI workflow (mirrors `bun run lint`, etc.)

### File Structure
```
src/
└── (no direct changes anticipated, but lint targets all TS sources)

docs/
├── AGENTS.md (update Biome references)
├── CONTRIBUTING.md (workflow updates)
├── docs/testing/test-structure.md (command references)
└── plans/tasks/2025-11-17-biome-v2-migration.md (this plan)

configs/
├── biome.json (schema + rule updates)
├── package.json (dependency/scripts)
└── bun.lock / package-lock.json (regenerated)

tests/
└── bun test suites ensuring lint-related ignores still valid
```

### Data Flow
1. Developer installs deps → Biome v2 CLI available → scripts run via Bun/NPM.
2. `biome check` consumes `biome.json`, scans `src/**/*.ts`, outputs diagnostics.
3. Docs/CI instruct contributors to run updated scripts ensuring consistent results.

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [x] **Task 1.1**: Analyze Biome v2 release notes and compatibility matrix.
  - **TDD Approach**: Not testable via code; capture acceptance by linking to release notes and enumerating breaking changes affecting repo.
  - **Implementation**: Document rule/CLI differences influencing config/scripts.
  - **Acceptance Criteria**: Summary of required config changes validated against release notes. *(Completed 2025-11-17 via Biome migrate output review and schema diffing.)*

- [x] **Task 1.2**: Bump `@biomejs/biome` to v2 in `package.json` and regenerate locks.
  - **TDD Approach**: Run `npm install` and `bun install`, ensuring lockfiles regenerate; later tests verify lint script uses v2.
  - **Implementation**: Update version, reinstall deps, confirm `biome --version` outputs v2.x.
  - **Acceptance Criteria**: `package.json` and lockfiles reference Biome v2; local CLI reports v2. *(Completed 2025-11-17.)*

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 1 day

- [x] **Task 2.1**: Update `biome.json` schema/rules to v2 format.
  - **TDD Approach**: Run `bun run lint` expecting new config to load; start with failing run if schema outdated, adjust until passing.
  - **Implementation**: Point `$schema` to v2, remove deprecated options, rename rules where necessary, reevaluate file ignore patterns per v2 best practices.
  - **Acceptance Criteria**: `bun run lint` succeeds using the new config; rule set matches intended severity. *(Completed 2025-11-17 with rule overrides for new diagnostics.)*

- [x] **Task 2.2**: Validate CLI scripts and CI commands.
  - **TDD Approach**: Execute `bun run lint`, `bun run lint:fix`, `bun run format`, `bun run check`, `bun test`, `bun run build`.
  - **Implementation**: Adjust script arguments if Biome v2 changes defaults (e.g., `biome lint` vs `biome check`), ensure no warnings.
  - **Acceptance Criteria**: All commands succeed without warnings; document any necessary script adjustments. *(Completed 2025-11-17 with lint/check/test/build runs.)*

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.5 day

- [x] **Task 3.1**: Update documentation references.
  - **Implementation**: Revise AGENTS.md, CONTRIBUTING.md, docs/testing/test-structure.md, CLAUDE.md to mention Biome v2 usage and updated commands.
  - **Acceptance Criteria**: All docs reference Biome v2 and accurate commands. *(Completed 2025-11-17.)*

- [x] **Task 3.2**: Final validation and PR preparation.
  - **Implementation**: Capture command outputs, summarize changes, ensure coverage unaffected.
  - **Acceptance Criteria**: Checklist for Definition of Done satisfied; PR description includes lint/typecheck/test/build logs. *(Validation complete 2025-11-17.)*

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow @docs/rules/tdd-development-workflow.md—write or adjust tests/integration checks before implementation where applicable (e.g., expect lint to fail with old schema before updating).

**Test Categories**:
- **Unit Tests**: Not directly impacted, but ensure existing specs compile after lint config change.
- **Integration Tests**: Rely on `bun run lint`, `bun run test`, `bun run build` as tooling integration checks.
- **End-to-End Tests**: Full workflow (install → lint → build) executed prior to PR.

### Test Implementation Order
1. **Red Phase**: Run `bun run lint` with Biome v2 dependency but old config to witness failures/mismatches.
2. **Green Phase**: Update config/scripts until the commands pass.
3. **Refactor Phase**: Clean up config duplication, prune unnecessary ignores, document process.

### Test Files Structure
```
tests/
├── existing unit/integration suites (no new files unless regressions appear)
└── coverage/ (validate metrics after final run)
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
// No new runtime interfaces; focus is on configuration.
// Ensure TypeScript definitions for Biome configs remain valid JSON schema.
```

### Configuration Changes
- `$schema`: `https://biomejs.dev/schemas/2.0.0/schema.json`
- Remove/rename deprecated rule keys (e.g., confirm `complexity.noBannedTypes` still exists).
- Consider new v2 options: `formatter.ignore`, `files.ignore` compatibility, `organizeImports` settings.
- Ensure ignore glob patterns align with repository (tests, dist, coverage).

### CLI Commands
- `npm run lint` / `bun run lint`: Should invoke `biome check src`.
- `npm run lint:fix`: `biome check --apply src`.
- `npm run format`: `biome format src --write`.

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Scenario 1**: Biome v2 fails due to invalid schema fields. Mitigation: follow release notes, remove unsupported options.
- **Scenario 2**: Lockfile conflicts when regenerating with Bun vs NPM. Mitigation: run both installs sequentially, commit both lockfiles.

### Edge Cases
- **Edge Case 1**: Custom ignores inadvertently exclude needed files. Validate by temporarily running lint across repo to confirm coverage.
- **Edge Case 2**: Contributors using Node-only workflow need consistent commands; ensure `npm run lint` mirrors Bun behavior.

### Validation Requirements
- Confirm `biome check` runs against intended directories.
- Ensure formatters handle JSON/TS/TSX consistently after upgrade.

---

## 7. Performance Considerations

### Performance Requirements
- Lint/format commands should complete within current CI time budgets; Biome v2 is expected to be faster.

### Memory Management
- Biome runs within CLI memory; monitor for significant regressions by comparing before/after runtime if possible.

---

## 8. Progress Tracking

### Milestones
- [x] **Milestone 1**: Dependency Upgraded - Target: 2025-11-18 (Completed 2025-11-17)
  - [x] Tasks 1.1–1.2 complete
  - [x] `biome --version` returns v2.x
  
- [x] **Milestone 2**: Config & Scripts Updated - Target: 2025-11-19 (Completed 2025-11-17)
  - [x] Tasks 2.1–2.2 complete
  - [x] All lint/format/check commands passing
  
- [x] **Milestone 3**: Documentation & Validation Complete - Target: 2025-11-20 (Completed 2025-11-17)
  - [x] Tasks 3.1–3.2 complete
  - [x] Definition of Done satisfied

### Progress Updates
**Last Updated**: 2025-11-17  
**Current Status**: All tasks completed; awaiting review/merge  
**Blockers**: None  
**Next Steps**: Prepare PR with validation logs and request code review

---

## 9. Definition of Done

### Completion Criteria
- [ ] `@biomejs/biome` v2 installed with updated lockfiles
- [ ] `biome.json` conforms to v2 schema without warnings
- [ ] Documentation references Biome v2 workflows
- [ ] All scripts (`lint`, `lint:fix`, `format`, `check`) succeed
- [ ] CI-equivalent commands run locally and documented
- [ ] No regressions in lint coverage or formatting

### Acceptance Testing
- [ ] Functional: `bun run lint`, `bun run format`, `bun run check`, `bun test`, `bun run build`
- [ ] Non-Functional: Tooling performance acceptable
- [ ] Edge Cases: Ignored paths and fixture handling validated

### Code Quality Checks
- [ ] `npm run lint` / `bun run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] Coverage ≥ mandated thresholds

---

## 10. Risk Assessment

### High Risk Items
- **Risk 1**: New Biome rules introduce blocking errors across many files. Mitigation: temporarily downgrade severity or add targeted suppressions while refactoring.
- **Risk 2**: Schema changes break CI pipelines. Mitigation: verify locally before pushing, update CI docs.

### Dependencies & Blockers
- External: Availability of Biome v2 documentation and release assets.
- Internal: Need for test fixtures to remain lint-exempt; coordinate with teams owning fixtures.

### Contingency Plans
- **Plan A**: Complete migration directly to latest stable v2.
- **Plan B**: If blockers arise, pin to intermediate v2.x with minimal rule set, then iterate.

---

## 11. Notes & Decisions

### Implementation Notes
- Keep `biome.json` ignores aligned with `tsconfig` includes.
- Consider enabling new v2 options (e.g., `organizeImports` improvements) only after base migration stabilizes.

### Decision Log
- **Decision 1**: Prioritize dependency/config updates before doc updates to reduce merge conflicts.
- **Decision 2**: Maintain both Bun and NPM lockfiles for parity per repo standards.

### Questions for Executor
- Are there CI workflows beyond documented scripts that call Biome (e.g., GitHub Actions) needing updates?
- Should we adopt any new v2 recommended rules during this migration or keep old set?

---

## 12. Resources & References

### Documentation
- **Requirements**: @docs/prd/mvp-requirements.md
- **Workflow**: @docs/rules/tdd-development-workflow.md
- **Tooling Guides**: AGENTS.md, CONTRIBUTING.md, docs/testing/test-structure.md

### External Resources
- Biome v2 Release Notes / Migration Guide
- Biome Configuration Schema Docs (`https://biomejs.dev`)

### Code Examples
- Existing lint workflow scripts in `package.json`
- Prior tooling upgrade plans in `docs/plans/tasks/*`
