# Implementation Plan: Global NPM Package Installation

**Created by**: implementation-planner
**Date**: 2025-11-11
**Version**: v0.1
**Status**: Planning

---

## 1. Overview

### Feature/Task Description

Enable ng-di-graph to be installed and executed globally via npm as a standard Node.js CLI tool. Users should be able to install the package globally and run it from any directory without needing to clone the repository or install it locally.

**Goal**: Make `npm install -g ng-di-graph` work correctly and allow users to execute `ng-di-graph --help` from any directory on their system.

**Scope**:
- **Included**:
  - Package.json configuration for npm publishing
  - Executable permissions setup
  - Local testing workflow with `npm link`
  - Distribution file optimization
  - Publishing readiness verification
- **Excluded**:
  - Actual npm registry publishing (manual step after implementation)
  - Version management automation
  - CI/CD publishing pipelines
  - Bun standalone executable distribution

**Priority**: High

### Context & Background

- **Requirements**: @docs/prd/mvp-requirements.md#0-distribution--installation
- **Related Documentation**: @CLAUDE.md (Development Commands section)
- **Dependencies**:
  - Build system must be working (`npm run build`)
  - CLI entry point exists at `src/cli/index.ts`
  - Node.js-compatible output bundle configured

**Current Status**:
- ✅ Shebang line (`#!/usr/bin/env node`) exists in src/cli/index.ts (line 1)
- ✅ `bin` field configured in package.json pointing to `dist/cli/index.js`
- ✅ Node.js-compatible build script exists (`npm run build`)
- ✅ Documentation Section 0 added to docs/prd/mvp-requirements.md
- ⚠️ Missing: `files` field in package.json
- ⚠️ Missing: `prepublishOnly` script in package.json
- ⚠️ Missing: Git executable permissions on CLI entry point
- ⚠️ Missing: Local installation testing verification

---

## 2. Technical Approach

### Architecture Decisions

**Design Pattern**: Standard npm CLI package distribution model

**Technology Stack**:
- **Runtime**: Node.js ≥18.0.0 (already specified in `engines` field)
- **Build Tool**: Bun bundler (fast, produces Node.js-compatible output)
- **Package Manager**: npm (for distribution and global installation)
- **CLI Framework**: Commander.js (already in use)

**Integration Points**:
- Build output directory (`dist/cli/index.js`) must be included in published package
- Shebang line ensures cross-platform executable behavior
- Git tracks executable permissions for Unix-like systems

### File Structure

Current structure (no new files required):
```
ng-di-graph/
├── package.json              # Update with files[] and prepublishOnly
├── src/
│   └── cli/
│       └── index.ts          # Already has shebang, needs +x permission
├── dist/
│   └── cli/
│       ├── index.js          # Build output (created by npm run build)
│       └── index.js.map      # Source map (created by npm run build)
└── docs/
    └── prd/
        └── mvp-requirements.md  # Already documents Section 0
```

### Data Flow

```
1. Developer runs: npm run build
   └─> Bun bundles src/cli/index.ts → dist/cli/index.js (Node.js compatible)

2. Developer runs: npm publish (or with --dry-run for testing)
   └─> prepublishOnly hook runs: npm run build (ensures fresh build)
   └─> npm packages only files[] listed: dist/ directory
   └─> Uploads to npm registry

3. User runs: npm install -g ng-di-graph
   └─> npm downloads package
   └─> npm creates symlink: ng-di-graph → dist/cli/index.js
   └─> Shebang line ensures Node.js execution

4. User runs: ng-di-graph --help (from any directory)
   └─> OS executes: node dist/cli/index.js --help
   └─> CLI runs successfully
```

---

## 3. Implementation Tasks

### Phase 1: Package.json Configuration

**Priority**: High
**Estimated Duration**: 15 minutes

- [ ] **Task 1.1**: Add `files` field to package.json
  - **File**: `/Users/matsumotoyoshio/Works/nd-di-graph/package.json`
  - **Location**: After the `bin` field (after line 8)
  - **Content**:
    ```json
    "files": [
      "dist"
    ],
    ```
  - **Purpose**: Limit published npm package to only the compiled `dist/` directory, reducing package size and avoiding publishing source code, tests, or configuration files
  - **Verification**: Run `npm pack --dry-run` and confirm only `dist/` files are listed
  - **Success Criteria**: Field exists with correct value, dry-run shows minimal file list

- [ ] **Task 1.2**: Add `prepublishOnly` script to package.json
  - **File**: `/Users/matsumotoyoshio/Works/nd-di-graph/package.json`
  - **Location**: In the `scripts` section (after line 24, before closing brace)
  - **Content**:
    ```json
    "prepublishOnly": "npm run build"
    ```
  - **Purpose**: Automatically rebuild the project before publishing to ensure the latest compiled code is included
  - **Verification**: Run `npm publish --dry-run` and confirm build script executes first
  - **Success Criteria**: Script runs automatically on publish attempt, build succeeds

### Phase 2: Executable Permissions Setup

**Priority**: High
**Estimated Duration**: 10 minutes

- [ ] **Task 2.1**: Set git executable bit on CLI entry point
  - **Command**:
    ```bash
    git update-index --chmod=+x /Users/matsumotoyoshio/Works/nd-di-graph/src/cli/index.ts
    ```
  - **Purpose**: Track executable permissions in git for Unix-like systems (Linux, macOS)
  - **Verification**: Run `git ls-files --stage /Users/matsumotoyoshio/Works/nd-di-graph/src/cli/index.ts`
  - **Expected Output**: File mode should show `100755` (executable) instead of `100644`
  - **Success Criteria**: Git shows executable bit set, permissions persist across clones

- [ ] **Task 2.2**: Verify executable permissions in build output
  - **Command**:
    ```bash
    npm run build && ls -la /Users/matsumotoyoshio/Works/nd-di-graph/dist/cli/index.js
    ```
  - **Purpose**: Confirm build process preserves executable permissions
  - **Expected Output**: Build succeeds, output file has executable permissions
  - **Success Criteria**: dist/cli/index.js is executable after build

### Phase 3: Local Testing Workflow

**Priority**: High
**Estimated Duration**: 20 minutes

- [ ] **Task 3.1**: Run build verification
  - **Commands**:
    ```bash
    cd /Users/matsumotoyoshio/Works/nd-di-graph
    npm run build
    ```
  - **Purpose**: Ensure clean build succeeds before testing
  - **Expected Output**:
    - Build completes successfully
    - Files created: `dist/cli/index.js` and `dist/cli/index.js.map`
  - **Success Criteria**: Build exits with code 0, output files exist

- [ ] **Task 3.2**: Create global symlink with npm link
  - **Commands**:
    ```bash
    cd /Users/matsumotoyoshio/Works/nd-di-graph
    npm link
    ```
  - **Purpose**: Create a global symlink to test the CLI as if it were globally installed
  - **Expected Output**:
    - `npm link` succeeds
    - Symlink created in global node_modules
  - **Verification**: Run `which ng-di-graph` to confirm global command exists
  - **Success Criteria**: Command `which ng-di-graph` returns a valid path

- [ ] **Task 3.3**: Test CLI execution from different directory
  - **Commands**:
    ```bash
    # Change to a different directory
    cd /tmp

    # Test help command
    ng-di-graph --help

    # Test version command
    ng-di-graph --version

    # Test with sample project (if available)
    cd /path/to/angular/project
    ng-di-graph -p ./tsconfig.json -f json
    ```
  - **Purpose**: Verify the CLI works correctly when invoked from any directory
  - **Expected Output**:
    - Help text displays all CLI options
    - Version shows `0.1.0`
    - Sample execution produces valid output
  - **Success Criteria**: All commands execute successfully from non-project directories

- [ ] **Task 3.4**: Cleanup test installation
  - **Commands**:
    ```bash
    npm unlink -g ng-di-graph
    ```
  - **Purpose**: Remove the global symlink after testing
  - **Verification**: Run `which ng-di-graph` and confirm command not found
  - **Success Criteria**: Global symlink removed, command no longer accessible

- [ ] **Task 3.5**: Test npm pack simulation
  - **Commands**:
    ```bash
    cd /Users/matsumotoyoshio/Works/nd-di-graph
    npm pack --dry-run
    ```
  - **Purpose**: Simulate package creation and verify only correct files are included
  - **Expected Output**:
    - List of files to be published (should only show `dist/` contents and package metadata)
    - Total package size (should be small, ~100KB estimated)
  - **Verification**: Review file list, ensure no source files, tests, or unnecessary config files included
  - **Success Criteria**: Only `dist/` directory and essential files (package.json, README.md, LICENSE) listed

### Phase 4: Documentation Updates (Optional)

**Priority**: Low
**Estimated Duration**: 15 minutes

- [ ] **Task 4.1**: Verify Section 0 in mvp-requirements.md
  - **File**: `/Users/matsumotoyoshio/Works/nd-di-graph/docs/prd/mvp-requirements.md`
  - **Action**: Review Section 0 (Distribution & Installation) for accuracy
  - **Update**: Mark all requirements as ✅ Configured after implementation
  - **Success Criteria**: Documentation reflects completed implementation

- [ ] **Task 4.2**: Update CLAUDE.md with publishing workflow (optional)
  - **File**: `/Users/matsumotoyoshio/Works/nd-di-graph/CLAUDE.md`
  - **Location**: Add new section or update existing Development Commands section
  - **Content**: Document the local testing workflow with `npm link`
  - **Purpose**: Help future developers test global installation locally
  - **Success Criteria**: Clear instructions added for local testing

---

## 4. Test-Driven Development Plan

### Test Strategy

**Approach**: Manual integration testing (CLI behavior verification)

This implementation involves configuration changes rather than code implementation, so TDD is not directly applicable. Instead, we use **verification-driven implementation**:

1. **Configuration Change**: Make a package.json or permissions change
2. **Verification**: Run commands to verify the change works as expected
3. **Validation**: Test end-to-end workflow with `npm link`

### Test Categories

- **Configuration Tests**: Verify package.json fields are correct
- **Build Tests**: Ensure build produces executable output
- **Integration Tests**: Test global installation simulation with `npm link`
- **End-to-End Tests**: Execute CLI from different directories

### Test Implementation Order

1. **Package.json Validation**:
   - Verify `files` field syntax with `npm pack --dry-run`
   - Confirm `prepublishOnly` runs with `npm publish --dry-run`

2. **Permissions Validation**:
   - Check git executable bit with `git ls-files --stage`
   - Verify build output has executable permissions

3. **Integration Validation**:
   - Test `npm link` creates global symlink
   - Execute CLI from multiple directories
   - Verify all CLI options work correctly

4. **Cleanup Validation**:
   - Confirm `npm unlink` removes global command
   - Ensure no leftover artifacts

### Manual Test Checklist

```bash
# Pre-implementation checklist
[ ] npm run build succeeds
[ ] dist/cli/index.js exists
[ ] Shebang line present in src/cli/index.ts

# Post-implementation checklist
[ ] npm pack --dry-run shows only dist/ directory
[ ] git ls-files --stage shows 100755 for src/cli/index.ts
[ ] npm link succeeds without errors
[ ] which ng-di-graph returns valid path
[ ] ng-di-graph --help displays from /tmp directory
[ ] ng-di-graph --version shows 0.1.0
[ ] npm unlink -g ng-di-graph removes command
```

---

## 5. Technical Specifications

### Package.json Changes

**Before (current state)**:
```json
{
  "name": "ng-di-graph",
  "version": "0.1.0",
  "description": "Angular DI dependency graph CLI tool",
  "main": "dist/index.js",
  "bin": {
    "ng-di-graph": "dist/cli/index.js"
  },
  "scripts": {
    "dev": "bun src/cli/index.ts",
    // ... other scripts
    "clean": "rimraf dist",
    "install:bun": "bun install"
  },
  // ... rest of package.json
}
```

**After (with changes)**:
```json
{
  "name": "ng-di-graph",
  "version": "0.1.0",
  "description": "Angular DI dependency graph CLI tool",
  "main": "dist/index.js",
  "bin": {
    "ng-di-graph": "dist/cli/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "bun src/cli/index.ts",
    // ... other scripts
    "clean": "rimraf dist",
    "install:bun": "bun install",
    "prepublishOnly": "npm run build"
  },
  // ... rest of package.json
}
```

### Git Configuration

**Executable Bit Tracking**:
- **Command**: `git update-index --chmod=+x src/cli/index.ts`
- **Effect**: Git tracks file as executable (mode 100755)
- **Persistence**: Permissions preserved in git history and across clones
- **Platform**: Required for Unix-like systems (Linux, macOS)
- **Windows Note**: Windows uses file extensions (.exe, .bat) for executables; shebang and npm handle cross-platform compatibility

### NPM Package Behavior

**Published Package Contents** (after `files` field added):
```
ng-di-graph-0.1.0.tgz
├── package.json          (automatically included)
├── README.md            (automatically included)
├── LICENSE              (automatically included)
└── dist/
    └── cli/
        ├── index.js
        └── index.js.map
```

**Excluded from Package** (source code, tests, configs):
- `src/` directory (source TypeScript files)
- `tests/` directory (test files)
- `node_modules/` (always excluded)
- `docs/` directory (documentation)
- Configuration files (biome.json, tsconfig.json, etc.)
- Development files (.gitignore, .github/, etc.)

---

## 6. Error Handling & Edge Cases

### Error Scenarios

- **Scenario 1: Build fails before publish**
  - **Condition**: `npm run build` fails in `prepublishOnly` hook
  - **Handling**: npm publish aborts, error message displayed
  - **User Action**: Fix build errors, retry publish
  - **Prevention**: Always run `npm run build` and tests before publishing

- **Scenario 2: Missing dist/ directory**
  - **Condition**: `dist/` directory doesn't exist or is empty
  - **Handling**: npm publish fails with "File not found" error
  - **User Action**: Run `npm run build` manually, verify output
  - **Prevention**: `prepublishOnly` script ensures fresh build

- **Scenario 3: Executable permissions lost**
  - **Condition**: Git doesn't track executable bit (not set with `git update-index`)
  - **Handling**: CLI may fail to execute on Unix systems after clone
  - **User Action**: Manually set `chmod +x dist/cli/index.js` after install
  - **Prevention**: Set git executable bit as documented

- **Scenario 4: npm link conflicts**
  - **Condition**: Another package already provides `ng-di-graph` command
  - **Handling**: npm link fails with "EEXIST" error
  - **User Action**: Unlink existing package first, then retry
  - **Command**: `npm unlink -g ng-di-graph && npm link`

### Edge Cases

- **Edge Case 1: Windows executable behavior**
  - **Scenario**: Windows doesn't use executable permissions
  - **Handling**: npm automatically handles cross-platform execution via `bin` field
  - **Expected**: Shebang line works on Windows with Node.js installed
  - **Validation**: Test on Windows VM or CI environment

- **Edge Case 2: Global installation with different package managers**
  - **Scenario**: User tries `yarn global add ng-di-graph` or `pnpm install -g ng-di-graph`
  - **Handling**: Should work identically to npm install -g
  - **Expected**: All package managers respect `bin` and `files` fields
  - **Validation**: Test with yarn and pnpm if available

- **Edge Case 3: Package already globally installed**
  - **Scenario**: User runs `npm link` when package is already installed globally
  - **Handling**: npm updates existing global package symlink
  - **Expected**: Latest local version takes precedence
  - **User Action**: Run `npm unlink -g ng-di-graph` first if needed

### Validation Requirements

- **Input Validation**: None required (configuration changes only)
- **Output Validation**:
  - Verify `npm pack --dry-run` output includes only expected files
  - Check `dist/cli/index.js` starts with shebang line
  - Confirm executable permissions preserved in git

---

## 7. Performance Considerations

### Performance Requirements

- **Target Metrics**:
  - Build time: <5 seconds (current Bun build is ~268ms)
  - npm pack time: <2 seconds
  - npm install -g time: <10 seconds (network dependent)
  - CLI startup time: <1 second

- **Bottlenecks**:
  - Network speed affects global installation time
  - Build step in `prepublishOnly` adds ~268ms to publish process

- **Optimization Strategy**:
  - Bun bundler already provides fast builds
  - Minification reduces package size
  - `files` field minimizes published package size

### Memory Management

- **Package Size**:
  - Estimated: ~100KB (bundled, minified JavaScript)
  - Actual: Measure with `npm pack --dry-run` and check .tgz size
  - Target: Keep under 500KB for fast installation

- **Installation Footprint**:
  - Global installation creates symlink (minimal disk usage)
  - Only `dist/` directory installed (no source code or dev dependencies)

---

## 8. Progress Tracking

### Milestones

- [ ] **Milestone 1**: Package Configuration Complete
  - [ ] `files` field added to package.json
  - [ ] `prepublishOnly` script added to package.json
  - [ ] npm pack --dry-run shows correct file list

- [ ] **Milestone 2**: Executable Permissions Set
  - [ ] Git executable bit set on src/cli/index.ts
  - [ ] Git shows file mode 100755
  - [ ] Build output has executable permissions

- [ ] **Milestone 3**: Local Testing Successful
  - [ ] npm link creates global symlink
  - [ ] CLI executes from any directory
  - [ ] All CLI options work correctly
  - [ ] npm unlink removes global command

- [ ] **Milestone 4**: Publishing Readiness Verified
  - [ ] npm publish --dry-run succeeds
  - [ ] Package contents verified with npm pack
  - [ ] Documentation updated
  - [ ] Ready for actual npm publish

### Progress Updates

**Last Updated**: 2025-11-11
**Current Status**: Planning phase - document created, awaiting execution
**Blockers**: None identified
**Next Steps**:
1. Execute Phase 1: Add `files` and `prepublishOnly` to package.json
2. Execute Phase 2: Set git executable permissions
3. Execute Phase 3: Test with `npm link`
4. Execute Phase 4: Update documentation (optional)

---

## 9. Definition of Done

### Completion Criteria

- [ ] `files` field added to package.json with value `["dist"]`
- [ ] `prepublishOnly` script added to package.json with value `"npm run build"`
- [ ] Git executable bit set on src/cli/index.ts (mode 100755)
- [ ] npm pack --dry-run shows only dist/ directory contents
- [ ] npm link successfully creates global command
- [ ] CLI executes correctly from any directory
- [ ] ng-di-graph --help displays complete usage information
- [ ] ng-di-graph --version shows correct version (0.1.0)
- [ ] npm unlink -g removes global command cleanly
- [ ] Documentation updated to reflect completed status

### Acceptance Testing

- [ ] **Functional Requirements**:
  - [ ] npm install -g ng-di-graph would work (verified via npm link)
  - [ ] CLI command accessible globally
  - [ ] All CLI options function correctly

- [ ] **Non-Functional Requirements**:
  - [ ] Package size is minimal (under 500KB)
  - [ ] Installation time is fast (under 10 seconds)
  - [ ] Cross-platform compatibility maintained

- [ ] **Edge Cases**:
  - [ ] Works on macOS (primary development platform)
  - [ ] Shebang line handles Node.js execution
  - [ ] Permissions preserved across git operations

### Code Quality Checks

- [ ] `npm run lint` passes (no changes to code, but verify no issues)
- [ ] `npm run typecheck` passes (verify TypeScript compilation)
- [ ] `npm run test` all tests pass (verify no regressions)
- [ ] `npm run build` succeeds (verify build process intact)

---

## 10. Risk Assessment

### High Risk Items

- **Risk 1: Executable permissions not preserved across platforms**
  - **Mitigation**:
    - Git tracks executable bit with `git update-index --chmod=+x`
    - npm handles cross-platform execution via `bin` field
    - Shebang line ensures Node.js execution on Unix-like systems
  - **Fallback**: Manual chmod +x after clone (rare case)

- **Risk 2: Build fails in prepublishOnly hook**
  - **Mitigation**:
    - Always run `npm run build` and `npm test` before `npm publish`
    - Test with `npm publish --dry-run` first
    - CI pipeline should test build process
  - **Fallback**: Manual build before publish if hook fails

### Medium Risk Items

- **Risk 3: Package size larger than expected**
  - **Mitigation**:
    - `files` field limits to dist/ directory only
    - Bun bundler minifies output
    - Verify size with `npm pack --dry-run`
  - **Impact**: Slower installation, but unlikely to exceed 500KB

- **Risk 4: npm link conflicts with existing global package**
  - **Mitigation**:
    - Document cleanup with `npm unlink -g`
    - Check for conflicts before testing
  - **Impact**: Manual intervention required, but easy to resolve

### Dependencies & Blockers

- **External Dependencies**:
  - Node.js ≥18.0.0 installed on user's system
  - npm package manager available globally
  - Network access to npm registry (for future actual publishing)

- **Internal Dependencies**:
  - Build system must be working (`npm run build`)
  - CLI entry point at `src/cli/index.ts` must be functional
  - All existing tests must pass

### Contingency Plans

- **Plan A: Standard npm package distribution (primary approach)**
  - Package.json with `files` and `prepublishOnly`
  - Global installation via `npm install -g`
  - Cross-platform compatibility via shebang and `bin` field

- **Plan B: Manual distribution if npm publish fails**
  - Users can clone repository and run `npm link` manually
  - Instructions added to README for local installation
  - Not ideal, but functional fallback

- **Plan C: Alternative distribution via GitHub releases**
  - Publish compiled binaries as GitHub release assets
  - Users download and install manually
  - Only if npm registry unavailable (unlikely)

---

## 11. Notes & Decisions

### Implementation Notes

**Important: This implementation involves configuration changes only - no code modifications required.**

**Key Configuration Changes**:
1. **package.json `files` field**: Critical for controlling what gets published to npm
2. **package.json `prepublishOnly` script**: Ensures build runs before every publish attempt
3. **Git executable permissions**: Required for Unix-like systems to execute CLI without manual chmod

**Testing Strategy**:
- Use `npm link` to simulate global installation locally
- Test from different directories to verify PATH resolution
- Use `npm pack --dry-run` to preview package contents without actually creating tarball

**Common Pitfalls**:
- Forgetting to build before testing (prepublishOnly solves this for publishing)
- Not verifying package contents with `npm pack --dry-run`
- Missing git executable permissions (only affects Unix-like systems)
- Testing in project directory (doesn't verify global PATH resolution)

### Decision Log

- **Decision 1: Use `files` field instead of `.npmignore`**
  - **Rationale**: `files` is a whitelist approach (safer, more explicit)
  - `.npmignore` is a blacklist approach (easier to accidentally publish sensitive files)
  - Modern npm best practice prefers `files` field
  - **Impact**: Only `dist/` directory published, reducing package size

- **Decision 2: Use `prepublishOnly` instead of `prepare`**
  - **Rationale**: `prepublishOnly` runs only before `npm publish`, not on every install
  - `prepare` runs on `npm install`, slowing down development workflow
  - **Impact**: Faster local development, build only happens before publishing

- **Decision 3: Node.js-compatible bundle instead of Bun standalone executable**
  - **Rationale**:
    - Standard npm distribution model
    - Smaller package size (~100KB vs ~30-50MB)
    - Cross-platform without multiple binaries
    - Consistent with npm ecosystem conventions
  - **Trade-off**: Requires Node.js installed on user's system
  - **Impact**: Standard CLI tool behavior, familiar to users

- **Decision 4: Keep Bun for development, distribute for Node.js**
  - **Rationale**:
    - Bun provides fast development experience (fast builds, native TS execution)
    - Node.js provides widest compatibility for distribution
    - Best of both worlds: developer speed + user compatibility
  - **Impact**: Developers use Bun, end users use Node.js

### Questions for Executor

- **Q1**: Should we add a post-install script to verify Node.js version?
  - **Recommendation**: No, npm `engines` field already enforces this
  - **Reasoning**: npm warns users if Node.js version doesn't match

- **Q2**: Should we test with yarn and pnpm as well?
  - **Recommendation**: Optional, npm compatibility implies yarn/pnpm compatibility
  - **Reasoning**: All modern package managers respect standard npm fields

- **Q3**: Should we automate version bumping?
  - **Recommendation**: Out of scope for this implementation
  - **Reasoning**: Manual version control provides better control for MVP

---

## 12. Resources & References

### Documentation

- **Requirements**: @docs/prd/mvp-requirements.md#0-distribution--installation
- **Development Guide**: @CLAUDE.md (Development Commands section)
- **TDD Workflow**: @docs/rules/tdd-development-workflow.md (not applicable for config changes)

### External Resources

- **npm `files` field documentation**: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#files
- **npm `bin` field documentation**: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#bin
- **npm scripts lifecycle**: https://docs.npmjs.com/cli/v10/using-npm/scripts#life-cycle-scripts
- **npm link documentation**: https://docs.npmjs.com/cli/v10/commands/npm-link
- **Git executable permissions**: https://git-scm.com/docs/git-update-index#Documentation/git-update-index.txt---chmod-x

### Commands Reference

**Build & Verification**:
```bash
# Build the project
npm run build

# Preview package contents without creating tarball
npm pack --dry-run

# Test publishing (doesn't actually publish)
npm publish --dry-run
```

**Git Permissions**:
```bash
# Set executable bit on CLI entry point
git update-index --chmod=+x src/cli/index.ts

# Verify executable bit is set
git ls-files --stage src/cli/index.ts
# Expected output: 100755 [hash] 0  src/cli/index.ts
```

**Local Testing**:
```bash
# Create global symlink for testing
npm link

# Verify global command exists
which ng-di-graph

# Test from different directory
cd /tmp && ng-di-graph --help

# Remove global symlink after testing
npm unlink -g ng-di-graph
```

**Publishing** (future step, not part of this implementation):
```bash
# Update version in package.json first (manual edit)

# Publish to npm registry (requires npm account)
npm publish

# Verify published package
npm info ng-di-graph
```

### Example Workflows

**Developer Testing Workflow**:
```bash
# 1. Make sure everything is up to date
git pull
npm install

# 2. Build the project
npm run build

# 3. Test locally with symlink
npm link

# 4. Test from a different directory
cd /tmp
ng-di-graph --help
ng-di-graph --version

# 5. Test with a real Angular project (if available)
cd /path/to/angular/project
ng-di-graph -p ./tsconfig.json -f json

# 6. Clean up
npm unlink -g ng-di-graph
cd /Users/matsumotoyoshio/Works/nd-di-graph
```

**Pre-Publishing Verification Workflow**:
```bash
# 1. Run all quality checks
npm run lint
npm run typecheck
npm run test

# 2. Build fresh
npm run clean
npm run build

# 3. Preview package contents
npm pack --dry-run

# 4. Test dry-run publish
npm publish --dry-run

# 5. Verify everything looks correct
# - Check file list from npm pack
# - Verify version number
# - Confirm no sensitive files included
# - Check package size is reasonable

# 6. Publish for real (when ready)
# npm publish
```

---

## Appendix: Current Package.json Analysis

### Current State (v0.1.0)

```json
{
  "name": "ng-di-graph",
  "version": "0.1.0",
  "description": "Angular DI dependency graph CLI tool",
  "main": "dist/index.js",
  "bin": {
    "ng-di-graph": "dist/cli/index.js"  // ✅ Correct
  },
  "scripts": {
    "dev": "bun src/cli/index.ts",
    "dev:node": "ts-node src/cli/index.ts",
    "build": "bun build src/cli/index.ts --outdir dist --target node --minify --sourcemap && mkdir -p dist/cli && mv dist/index.js dist/cli/index.js && mv dist/index.js.map dist/cli/index.js.map 2>/dev/null || true",  // ✅ Correct
    "build:node": "tsc",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "lint": "biome check src",
    "lint:fix": "biome check --apply src",
    "format": "biome format src --write",
    "check": "biome check src && npm run typecheck",
    "typecheck": "tsc --noEmit",
    "typecheck:bun": "bun x tsc --noEmit",
    "clean": "rimraf dist",
    "install:bun": "bun install"
    // ⚠️ Missing: "prepublishOnly": "npm run build"
  },
  "keywords": [
    "angular",
    "dependency-injection",
    "typescript",
    "cli",
    "graph"
  ],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0",  // ✅ Correct
    "bun": ">=1.2.0"
  }
  // ⚠️ Missing: "files": ["dist"]
}
```

### Required Additions

**Add after `bin` field**:
```json
"files": [
  "dist"
],
```

**Add in `scripts` section**:
```json
"prepublishOnly": "npm run build"
```

### Expected Final State

```json
{
  "name": "ng-di-graph",
  "version": "0.1.0",
  "description": "Angular DI dependency graph CLI tool",
  "main": "dist/index.js",
  "bin": {
    "ng-di-graph": "dist/cli/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "dev": "bun src/cli/index.ts",
    "dev:node": "ts-node src/cli/index.ts",
    "build": "bun build src/cli/index.ts --outdir dist --target node --minify --sourcemap && mkdir -p dist/cli && mv dist/index.js dist/cli/index.js && mv dist/index.js.map dist/cli/index.js.map 2>/dev/null || true",
    "build:node": "tsc",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "lint": "biome check src",
    "lint:fix": "biome check --apply src",
    "format": "biome format src --write",
    "check": "biome check src && npm run typecheck",
    "typecheck": "tsc --noEmit",
    "typecheck:bun": "bun x tsc --noEmit",
    "clean": "rimraf dist",
    "install:bun": "bun install",
    "prepublishOnly": "npm run build"
  },
  "keywords": [
    "angular",
    "dependency-injection",
    "typescript",
    "cli",
    "graph"
  ],
  "author": "",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.2.0"
  }
}
```

---

## Summary

This implementation plan provides a complete, step-by-step guide to making ng-di-graph globally installable via npm. The changes are minimal (two package.json fields and one git permission command) but critical for proper npm package distribution.

**Key Deliverables**:
1. ✅ Comprehensive implementation plan document created
2. ⏳ Ready for implementation-executor to execute tasks
3. ⏳ Clear verification steps for each task
4. ⏳ Complete testing workflow with npm link
5. ⏳ Publishing readiness checklist

**Next Steps**:
1. Review this plan with stakeholders
2. Execute Phase 1-3 tasks systematically
3. Verify each milestone with provided commands
4. Update documentation to reflect completed status
5. Prepare for actual npm publish (future step)

**Estimated Total Time**: 1 hour (60 minutes)
- Phase 1: 15 minutes
- Phase 2: 10 minutes
- Phase 3: 20 minutes
- Phase 4: 15 minutes (optional)

**Risk Level**: Low (configuration changes only, no code modifications)

**Success Metric**: `npm link` successfully creates global command, CLI executes from any directory
