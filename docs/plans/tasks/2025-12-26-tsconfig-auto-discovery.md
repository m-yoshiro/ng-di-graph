# Implementation Plan Template

**Created by**: implementation-planner  
**Executed by**: implementation-executor  
**Date**: 2025-12-26  
**Version**: v0.1  
**Status**: Planning

---

## 1. Overview

### Feature/Task Description
Add automatic tsconfig discovery when `--project` is omitted, mirroring stylelint-style config lookup. The CLI should locate the nearest applicable tsconfig (and optionally an Angular workspace-specified tsconfig) and use it to load the project without requiring explicit user input.

**Goal**: Enable `ng-di-graph` to run without `--project` by finding the correct tsconfig via directory search (and Angular workspace hints), while preserving explicit `--project` override precedence and clear errors when no config is found.

**Scope**: CLI project resolution logic, TypeScript/Angular-aware config discovery, integration tests, and documentation/help text updates; no changes to graph building or formatter behavior.

**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#6-functional-requirements
- **Related Documentation**: @docs/rules/tdd-development-workflow.md, stylelint config discovery references (getConfigForFile/augmentConfig)
- **Dependencies**: `src/cli/index.ts` (project resolution), `src/core/parser.ts` (tsconfig loading), CLI integration fixtures, Commander help/README usage sections

---

## 2. Technical Approach

### Architecture Decisions
**Design Pattern**: Introduce a discovery resolver that, when `--project` is absent, searches upward for `tsconfig.json` using `ts.findConfigFile`, falls back to Angular workspace (`angular.json`/`workspace.json`) to pick `architect.*.options.tsConfig`, and caches the resolved path per invocation. Explicit `--project` remains authoritative. Discovery only targets `tsconfig.json` (not `tsconfig.base.json`); if only a base config exists, error with guidance to pass `--project` or add a local `tsconfig.json`.

**Technology Stack**: 
- TypeScript `ts.findConfigFile` and `ts.sys.fileExists`
- Commander CLI parsing
- Node fs/path utilities
- ts-morph project loading (unchanged)

**Integration Points**:
- `src/cli/index.ts`: expand `resolveProjectPath` to support auto-discovery and keep directory input handling
- `src/core/parser.ts`: consume discovered path; retain validation and error messaging
- Tests under `tests/cli/` to cover default behavior; fixtures under `src/tests/fixtures/`
- README/help text to explain new default

### File Structure
```
src/
├── cli/index.ts              # Project resolution enhancement and option defaulting
├── core/parser.ts            # Uses resolved tsconfig; minor adjustments if needed for logging
└── tests/fixtures/           # Reuse existing Angular sample project tsconfigs

tests/
├── cli/auto-project.test.ts  # New integration cases for auto tsconfig discovery
└── cli/build-output.test.ts  # Ensure help text aligns with defaults (update if necessary)
```

### Data Flow
1. CLI receives args (with or without `--project`) → `resolveProjectPath` determines tsconfig path via explicit flag or discovery.
2. Discovery: start directory = common ancestor of file target dirs, or `cwd` if no file targets are provided. If file targets span multiple unrelated roots, raise a deterministic error rather than picking an arbitrary start directory. Use `ts.findConfigFile` for `tsconfig.json` upward search → if missing, inspect nearest `angular.json` for `tsConfig` reference → resolved absolute path returned.
3. `AngularParser.loadProject` loads ts-morph Project using the resolved path → parsing → graph/build/output unchanged.

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [ ] **Task 1.1**: Add failing tests for auto tsconfig discovery
  - **TDD Approach**: Write integration tests (`npm run test:watch`) expecting CLI success without `--project` when a tsconfig is discoverable, and clear error when none exists.
  - **Implementation**: New `tests/cli/auto-project.test.ts` using fixtures; cover cwd-based search, file-target-based search using common ancestor, multi-root targets erroring, and a nested monorepo fixture with multiple `tsconfig.json` files.
  - **Acceptance Criteria**: Tests fail prior to implementation; assertions describe deterministic discovery order, explicit multi-root errors, and error messaging.

- [ ] **Task 1.2**: Document intended behavior
  - **TDD Approach**: N/A (docs), but ensure help/README expectations noted for later validation.
  - **Implementation**: Draft README/help wording changes to mention auto-discovery default.
  - **Acceptance Criteria**: Documentation sections clearly explain default behavior and `--project` override.

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 1 day

- [ ] **Task 2.1**: Implement tsconfig discovery resolver
  - **TDD Approach**: Iteratively run new failing tests to guide behavior.
  - **Implementation**: Extend `resolveProjectPath` to (a) respect explicit `--project`, (b) accept directory input, (c) when undefined, compute a common-ancestor start dir or raise a multi-root error, (d) call `ts.findConfigFile` from the chosen start dir, (e) fall back to Angular workspace parsing for `tsConfig`, and (f) log discovery details under existing `--verbose`.
  - **Acceptance Criteria**: Resolver returns absolute path when found; caches within invocation; explicit flag still wins; errors surface `TSCONFIG_NOT_FOUND` with guidance when nothing is found; new multi-root error is deterministic and actionable.

- [ ] **Task 2.2**: Wire resolver into CLI defaults
  - **TDD Approach**: Ensure CLI options default `project` to `undefined` and rely on resolver; run integration suite.
  - **Implementation**: Adjust Commander default/help text, construct `CliOptions.project` from resolver output, and keep backward-compatible directory handling.
  - **Acceptance Criteria**: CLI runs without `--project` in fixture contexts; directory inputs still map to `tsconfig.json`; regression tests pass.

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.5 day

- [ ] **Task 3.1**: Update user-facing docs/help
  - **Implementation**: Refresh README usage examples and Commander help strings to reflect auto-discovery and explicit override guidance.
  - **Acceptance Criteria**: Help/README match implemented behavior; examples validated in tests where applicable.

- [ ] **Task 3.2**: Quality gates
  - **Implementation**: Run `npm run lint`, `npm run typecheck`, `npm run test`, and adjust minor code comments/import ordering to satisfy Biome.
  - **Acceptance Criteria**: All quality checks and coverage thresholds pass; no lint/type errors.

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md

**Test Categories**:
- **Unit Tests**: (optional) Resolver utility edge cases if factored out.
- **Integration Tests**: CLI end-to-end runs without `--project`, cwd-based search, file-target-based search, common-ancestor handling, multi-root input erroring, monorepo fixture with nested `tsconfig.json` files, and missing-config error handling.
- **End-to-End Tests**: Existing CLI bundle/help checks to ensure help text reflects defaults.

### Test Implementation Order
1. **Red Phase**: Add failing integration tests for auto discovery success and failure cases.
2. **Green Phase**: Implement resolver and CLI wiring to satisfy tests.
3. **Refactor Phase**: Clean up resolver, add caching/logging tweaks, and ensure readability.

### Test Files Structure
```
tests/
├── cli/
│   ├── auto-project.test.ts      # New discovery tests
│   └── build-output.test.ts      # Update help expectations if needed
└── fixtures/                     # Reuse existing Angular sample tsconfigs
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
// Potential helper signature if extracted
interface ProjectDiscoveryOptions {
  explicitProject?: string;
  fileTargets?: string[];
  cwd: string;
}

type ProjectPathResolver = (options: ProjectDiscoveryOptions) => string;
```

### API Design
```typescript
// CLI usage
const project = resolveProjectPath(options.project, mergedFiles, process.cwd());

// Resolver behavior
// 1. If explicitProject set -> normalize (dir to tsconfig.json) and return.
// 2. Else search tsconfig.json via ts.findConfigFile(startDir).
// 3. Else try angular.json/workspace.json lookup for tsConfig.
// 4. Else throw CliError TSCONFIG_NOT_FOUND.
```

### Configuration
- **Environment Variables**: None required.
- **Config Files**: Detect `tsconfig.json`; optionally read `angular.json`/`workspace.json` for `tsConfig` mapping.
- **Default Values**: `project` defaults to auto-discovery (no explicit path needed).

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **No tsconfig found**: Throw `TSCONFIG_NOT_FOUND` with guidance to pass `--project`.
- **Angular workspace present but tsConfig missing**: Warn/fallback to regular search; if none found, same error path.
- **Invalid tsconfig path**: Existing parser validation remains (JSONC errors, compiler options issues).

### Edge Cases
- **User passes directory to --project**: Still resolve to `tsconfig.json` inside directory.
- **Multiple candidate tsconfigs**: Use nearest upward match from start directory; explicit flag overrides.
- **Multiple roots from file targets**: Reject with a deterministic error instructing the user to pass `--project` or split runs.
- **File targets outside workspace**: Start search from target directory; ensure path normalization across platforms.
- **Symlinked directories**: Document discovery behavior. Prefer using logical paths for start directory; log resolved path in verbose output to avoid surprises.

### Validation Requirements
- Verify resolved path exists before parser load.
- Ensure errors include the searched start directory (and multi-root details) for user clarity.

---

## 7. Performance Considerations

### Performance Requirements
- Minimal overhead: single `findConfigFile` search and optional small JSON parse for Angular workspace.
- No additional I/O in steady-state parsing.

### Memory Management
- Cache resolved path per CLI invocation to avoid repeated disk lookups; no long-lived allocations.
- Do not load full workspace structures beyond required `tsConfig` fields.

---

## 8. Progress Tracking

### Milestones
- [ ] **Milestone 1**: Foundation Complete - 2025-12-27
  - [ ] Tests describing auto-discovery behavior exist and fail
  - [ ] Docs drafted with new default behavior
  
- [ ] **Milestone 2**: Core Implementation Complete - 2025-12-28
  - [ ] Resolver implemented and wired into CLI
  - [ ] Integration tests passing
  
- [ ] **Milestone 3**: Feature Complete - 2025-12-29
  - [ ] Help/README updated
  - [ ] Lint/typecheck/test all green

### Progress Updates
To be updated by the implementation-executor during execution.
