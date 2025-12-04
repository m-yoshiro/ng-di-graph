# CI npm publish runbook

## Overview
- PR-driven releases via Release Please (manifest mode) on `main`.
- Tag-triggered publish workflow builds, tests, packs, inspects tarball, and publishes with provenance.
- Build ownership: CI builds before publish; `prepublishOnly` removed to avoid double builds.

## Prerequisites
- Node.js version pinned by `.node-version` (20.19.0) in workflows.
- npm automation token (publish scope, 2FA bypass) stored as `NPM_TOKEN`.
- GitHub environment `npm-publish` with required reviewers and the `NPM_TOKEN` secret.

## Release flow
1) Release Please workflow (`.github/workflows/release-please.yml`)
   - Triggers: `workflow_dispatch`, cron `0 6 * * 1`.
   - Uses `.release-please-config.json` + `.release-please-manifest.json`.
   - Opens/updates PR titled `chore: release <version>` with changelog + version bump.
2) Merge release PR to `main`
   - Release Please creates tag `v<version>`.
3) Publish workflow (`.github/workflows/publish.yml`)
   - Trigger: push tags `v*`.
   - Permissions: `contents: read`, `id-token: write`; concurrency `publish-npm`.
   - Steps: checkout → setup-node (node-version-file) → private guard → `npm ci` →
     lint → typecheck → test → build → `npm pack` → list tarball contents →
     upload artifact → `npm publish --provenance --access public`.

## First run / bootstrap
- Manifest sets current version to `0.4.1` (`.release-please-manifest.json`), so no manual
  bootstrap flags needed.
- If tags drift from manifest, set `bootstrap-sha` in `.release-please-config.json` to the
  last released commit (currently `af9150ba3d12f277fee4e7d82e01b1dbc8cb7807` for `v0.4.1`).

## Local validation before merging workflow changes
- Release Please dry-run: `npx release-please release-pr --dry-run --default-branch=main --config .release-please-config.json --manifest .release-please-manifest.json`
- Pack dry-run: `npm pack --dry-run`
- Tarball inspect: `npm pack --pack-destination tmp-toolchain/ && tar -tvf tmp-toolchain/*.tgz`

## Failure handling
- Missing token: publish step fails fast on empty `NPM_TOKEN`.
- Private package: workflow aborts if `package.json` has `"private": true`.
- Duplicate tag: re-run will no-op; bump version via Release Please and retry.
- Rollback: use `npm deprecate ng-di-graph@<version> "reason"`; cut a patch release with fix.

## Canary (optional)
- Add a `workflow_dispatch` job to publish `--tag next` from a canary branch if needed; keep
  stable flow unchanged.

## Commands reference
- Install deps: `npm ci`
- Quality gates: `npm run lint && npm run typecheck && npm run test`
- Build: `npm run build`
- Pack: `npm pack --pack-destination tmp-toolchain/`
- Publish (CI only): `npm publish --provenance --access public`
