# Implementation Plan Template

**Created by**: task-planner  
**Executed by**: task-executor  
**Date**: 2025-12-01  
**Version**: v0.1  
**Status**: Planning

---

## 1. Overview

### Feature/Task Description
Introduce a PR-driven npm release workflow that uses Release Please to open release PRs, cut tags on merge, and trigger an automated publish job with provenance to npm.

**Goal**: Automate versioning, changelog generation, tagging, and npm publish with verified provenance and environment gates.

**Scope**: Add Release Please config and workflow, update/align tag-triggered publish workflow with npm provenance, environment + secret usage, documentation for maintainers. Excludes changes to package runtime behavior.

**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#release-management
- **Related Documentation**: @docs/rules/tdd-development-workflow.md, @docs/plans/template.md
- **Dependencies**: npm automation token (NPM_TOKEN) stored in environment, GitHub environment gate for publish, existing lint/test/build commands.

---

## 2. Technical Approach

### Architecture Decisions
**Design Pattern**: PR-driven releases via Release Please; tag-based publish workflow that runs quality gates then `npm publish --provenance`.

**Technology Stack**: 
- GitHub Actions (`actions/checkout@v4`, `actions/setup-node@v4`)
- Release Please GitHub Action (`googleapis/release-please-action`)
- npm automation token with 2FA bypass
- OIDC provenance for npm (`--provenance`)

**Integration Points**:
- Reuse existing scripts (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`)
- Publish job triggered on Release Please-created tags (`v*`)
- Optional `npm pack` artifact for inspection in `tmp-toolchain/`
- Use `actions/setup-node@v4` with `node-version-file: .node-version` to match local runtime and avoid subtle version drift

### File Structure
```
.github/workflows/
├── release-please.yml        # PR-driven release workflow
└── publish.yml               # Tag-triggered npm publish (update if already present)

docs/
└── release/ci-publish.md     # Maintainer guide and runbook (new)
```

### Data Flow
1. Merge feature PRs to `main`.
2. Release Please workflow opens/updates a release PR with changelog + version bump.
3. On merging the release PR, Release Please creates a `vX.Y.Z` tag.
4. Tag push triggers publish workflow → installs deps → lint/typecheck/test/build/pack → `npm publish --provenance`.
5. Publish uses `NPM_TOKEN` from environment with manual approval (environment gate) and emits provenance metadata.

---

## 3. Implementation Tasks

### Phase 1: Foundation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [ ] **Task 1.1**: Document release flow and prerequisites
  - **TDD Approach**: Draft doc updates, validate commands locally (`npm pack --dry-run`)
  - **Implementation**: Create `docs/release/ci-publish.md` describing token setup, environment gate, commands, failure handling.
  - **Acceptance Criteria**: Doc includes step-by-step runbook, token scope guidance, and rollback guidance.

- [ ] **Task 1.2**: Add Release Please configuration
  - **TDD Approach**: Use Release Please dry-run (`npx release-please release-pr --dry-run --default-branch=main`)
  - **Implementation**: Add `.release-please-config.json` (node package, manifest if needed) and configure changelog path; include `package-name`, `changelog-path`, tag pattern `v${version}`, and first-run bootstrap via `bootstrap-sha` or `bootstrap: true`.
  - **Acceptance Criteria**: Config matches package name/versioning scheme; dry-run shows expected PR title/body; bootstrap approach documented.

- [ ] **Task 1.3**: Decide build ownership vs `prepublishOnly`
  - **TDD Approach**: Run `npm pack --dry-run` locally before/after change to ensure no double-build
  - **Implementation**: Prefer CI-owned build (keep explicit `npm run build` in workflow) and remove/neutralize `prepublishOnly` to avoid duplicate builds; document final stance.
  - **Acceptance Criteria**: Single build source of truth; pack output identical pre/post change; doc updated.

### Phase 2: Core Implementation
**Priority**: High  
**Estimated Duration**: 0.5 day

- [ ] **Task 2.1**: Create Release Please GitHub Action
  - **TDD Approach**: Validate workflow syntax with `npm run lint` (if linting workflows) or `act -j release-please` when available.
  - **Implementation**: Add `.github/workflows/release-please.yml` scheduled + `workflow_dispatch` triggers; set permissions minimal (`contents: write`, `pull-requests: write`), `release-type: node`.
  - **Acceptance Criteria**: Workflow opens/updates PR on demand; uses `concurrency: release-please`; no direct publishing.

- [ ] **Task 2.2**: Implement/align tag-triggered publish workflow
  - **TDD Approach**: Dry-run `npm pack` locally; ensure `npm ci && npm run lint && npm run typecheck && npm run test && npm run build` pass.
  - **Implementation**: Add/update `.github/workflows/publish.yml` to trigger on `v*` tags, set `permissions: contents: read, id-token: write`, `concurrency: publish-npm`, use environment `npm-publish` with required reviewers, run `npm pack --pack-destination tmp-toolchain/`, list tarball contents for verification, then `npm publish --provenance --access public` with a fast-fail if `package.json` has `"private": true`.
  - **Acceptance Criteria**: Workflow references `NPM_TOKEN`, fails cleanly on missing token or private package, uploads pack artifact, logs tarball contents, and publishes only on tags.

### Phase 3: Integration & Polish
**Priority**: Medium  
**Estimated Duration**: 0.5 day

- [ ] **Task 3.1**: Guardrails and observability
  - **TDD Approach**: Simulate duplicate tag scenario; ensure workflow exits with clear message.
  - **Implementation**: Add `if: startsWith(github.ref_name, 'v')` guard, log provenance flag usage, optional Slack/Teams webhook stub.
  - **Acceptance Criteria**: Publish job is idempotent for reruns; logs include package name/version and provenance status.

- [ ] **Task 3.2**: Final verification and README updates
  - **TDD Approach**: Run `npm run test:watch` for any code touched; verify Release Please PR format after first run.
  - **Implementation**: Link release doc from `README.md` or contributor docs; note commands for local dry-run (`mise x node@$(cat .node-version) -- npx release-please ...`).
  - **Acceptance Criteria**: Documentation links live; first Release Please PR is clean; no missing commands in runbook.

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md

**Test Categories**:
- **Static/Dry-Run Checks**: YAML lint if available, `npx release-please release-pr --dry-run`, `npm pack --dry-run`, tarball content inspection.
- **Integration Tests**: Validate Release Please PR body/title locally; verify `npm pack` tarball contents and file filters.
- **End-to-End Tests**: Trigger `workflow_dispatch` for Release Please; simulate tag push in a fork with publish step disabled or pointing to a dummy package/tag.

### Test Implementation Order
1. **Red Phase**: Run `npm run test:watch` to confirm baseline passes; `npx release-please ... --dry-run` and `npm pack --dry-run` highlight missing config.
2. **Green Phase**: Add/adjust config until dry-runs succeed; confirm tarball contents list as expected.
3. **Refactor Phase**: Tighten workflow permissions/caching; document bootstrap and build ownership decisions.

### Test Files Structure
```
tests/
├── integration/
│   └── release-please-dry-run.md (notes/runbook)
└── e2e/
    └── workflow-simulation.md (optional instructions)
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
// Release Please config (conceptual)
interface ReleasePleaseConfig {
  releaseType: 'node';
  packageName: string;
  changelogPath: string;
  includeComponentInTag?: boolean;
}
```

### API Design
```yaml
# .github/workflows/release-please.yml
on:
  workflow_dispatch:
  schedule:
    - cron: "0 6 * * 1"
permissions:
  contents: write
  pull-requests: write
jobs:
  release-please:
    uses: googleapis/release-please-action@v4
```

### Configuration
- **Environment Variables**: `NPM_TOKEN` (Automation token, publish scope), optional `SLACK_WEBHOOK_URL` for notifications.
- **Config Files**: `.release-please-config.json`, optionally `release-please-manifest.json` if multi-package ever needed; include `package-name`, `changelog-path`, `bootstrap-sha`/`bootstrap: true`, `release-type: node`.
- **Default Values**: Tag pattern `v${version}`, changelog at `CHANGELOG.md`, registry `https://registry.npmjs.org/`.

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Missing NPM_TOKEN**: Fail publish step with clear error; gate via environment required secrets.
- **Tag Collision**: Detect existing version/tag and abort publish with message to increment version via Release Please.
- **2FA/Scope Issues**: Use npm automation token; document creation steps to avoid 2FA blocks.
- **Package marked private**: Fail fast before publish when `"private": true` is detected.

### Edge Cases
- **Pre-releases**: Support `--tag next` optional path; keep main flow for stable only.
- **Private registry use**: Explicitly set `registry-url` to npm to avoid corporate registry overrides.

### Validation Requirements
- **Input Validation**: Ensure tag matches `v\d+\.\d+\.\d+`.
- **Output Validation**: Verify `npm pack` contents exclude dev artifacts and include `dist/`.

---

## 7. Performance Considerations

### Performance Requirements
- Keep workflow under standard GitHub runner time (≤10-15 minutes) by caching npm.

### Bottlenecks
- Full test suite runtime; use npm cache and `tsdown` outputs if cached.

### Optimization Strategy
- Enable `actions/setup-node` npm cache; avoid redundant installs across steps; parallelize lint/typecheck/test where safe.

### Memory Management
- Standard runner resources sufficient; avoid large artifacts beyond `tmp-toolchain/*.tgz`.

---

## 8. Progress Tracking

### Milestones
- [ ] **Milestone 1**: Release Please configured - 2025-12-01
  - [ ] Tasks 1.1–1.2 completed
  - [ ] Dry-run produces expected PR
  
- [ ] **Milestone 2**: Publish workflow aligned - 2025-12-02
  - [ ] Tasks 2.1–2.2 completed
  - [ ] Tag-triggered workflow green in dry-run/fork
  
- [ ] **Milestone 3**: Docs & guardrails - 2025-12-03
  - [ ] Tasks 3.1–3.2 completed
  - [ ] Maintainer runbook published

### Progress Updates
**Last Updated**: 2025-12-02  
**Current Status**: Release automation implemented and tested locally (tests passing)  
**Blockers**: Need npm automation token in `npm-publish` environment or move to npm trusted publisher (OIDC)  
**Next Steps**: Configure env secret/gate, run Release Please dry-run or first PR, verify publish workflow on next tag

---

## 9. Definition of Done

### Completion Criteria
- [ ] Release Please workflow opens release PR with changelog + version bump
- [ ] Tag push triggers publish workflow and completes successfully with provenance
- [ ] `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` pass in CI
- [ ] `npm pack` artifact uploaded for inspection
- [ ] Maintainer documentation updated and linked
- [ ] Environment gate and secrets validated

### Acceptance Testing
- [ ] **Functional Requirements**: Release PR auto-generated; publish occurs only from tags
- [ ] **Non-Functional Requirements**: Provenance enabled; minimal permissions; manual approval on environment
- [ ] **Edge Cases**: Duplicate tag handled; missing token fails safely

### Code Quality Checks
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes  
- [ ] `npm run test` all tests pass
- [ ] Code coverage meets requirements (>70%)

---

## 10. Risk Assessment

### High Risk Items
- **Token leakage or mis-scope**: Mitigate via environment secrets and automation token.
- **Accidental double publish**: Mitigate with `concurrency: publish-npm` and tag guard.

### Dependencies & Blockers
- **External Dependencies**: npm availability, GitHub Actions runners.
- **Internal Dependencies**: Access to set environment protection rules and secrets.

### Contingency Plans
- **Plan A**: Tag-driven publish with Release Please.
- **Plan B**: Manual `npm publish` following same commands if CI blocked; document rollback via `npm deprecate`.

---

## 11. Notes & Decisions

### Implementation Notes
- Use `mise x node@$(cat .node-version) --` prefix when local shell reports mismatched Node.
- Keep workflow permissions minimal; `id-token: write` only for publish job provenance.

### Decision Log
- **Decision 1**: Chose Release Please over Changesets for single-package simplicity and PR-driven tagging.
- **Decision 2**: Enable provenance by default to display verified publisher on npm.

### Questions for Executor
- Should we support a `next` tag canary workflow now or defer?
- Any need for additional notifications (Slack/Teams) on publish completion/failure?

---

## 12. Resources & References

### Documentation
- **Requirements**: @docs/prd/mvp-requirements.md
- **Workflow**: @docs/rules/tdd-development-workflow.md
- **Architecture**: @docs/plans/template.md

### External Resources
- Release Please Action: https://github.com/googleapis/release-please-action
- npm provenance docs: https://docs.npmjs.com/generating-provenance-statements
- GitHub Actions OIDC for npm: https://docs.github.com/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect

### Code Examples
- Example Release Please config: https://github.com/googleapis/release-please/blob/main/docs/cli.md#configuration
- Publish workflow sample: https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow
