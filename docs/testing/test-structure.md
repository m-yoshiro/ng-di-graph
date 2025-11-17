# Test Structure Documentation

**Project**: ng-di-graph
**Version**: 0.1.0
**Last Updated**: 2025-11-10
**Test Framework**: Bun Test Runner

---

## Table of Contents

1. [Test Organization](#test-organization)
2. [Test Files Overview](#test-files-overview)
3. [Test Helper Libraries](#test-helper-libraries)
4. [Fixture Structure](#fixture-structure)
5. [Running Tests](#running-tests)
6. [Writing New Tests](#writing-new-tests)
7. [Test Naming Conventions](#test-naming-conventions)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Test Organization

The ng-di-graph test suite is organized into three primary categories:

### Unit Tests (Component-Specific)
Focus on individual components and classes in isolation, testing specific functionality without external dependencies.

**Files**:
- `parser.test.ts` - Parser core functionality
- `parser-decorator.test.ts` - Decorator detection and analysis
- `graph-builder.test.ts` - Graph construction logic
- `graph-filter.test.ts` - Entry point filtering algorithms
- `formatters.test.ts` - JSON and Mermaid output formatting
- `logger.test.ts` - Logger infrastructure
- `type-validation.test.ts` - Type resolution and validation

### Integration Tests
Test interactions between multiple components and validate complete workflows.

**Files**:
- `cli-integration.test.ts` - CLI interface end-to-end testing
- `bidirectional-filtering.test.ts` - Comprehensive filtering scenarios
- `verbose-e2e.test.ts` - Verbose mode end-to-end validation

### Error Handling Tests
Validate error recovery, error messages, and graceful degradation.

**Files**:
- `error-handling.test.ts` (in `tests/` directory) - System-wide error handling

---

## Test Files Overview

### Unit Test Files

#### `parser.test.ts` (1,293+ lines)
**Purpose**: Core parser functionality and ts-morph integration
**Functional Requirements**: FR-01, FR-02, FR-03, FR-04, FR-09, FR-12, FR-14
**Key Test Suites**:
- Project loading and tsconfig parsing (FR-01)
- Decorated class collection (@Injectable, @Component, @Directive) (FR-02)
- Constructor dependency extraction (FR-03)
- Parameter decorator detection (@Optional, @Self, @SkipSelf, @Host) (FR-04)
- Type resolution and any/unknown handling (FR-09)
- Verbose mode type resolution debugging (FR-12)
- Graceful file parsing failure handling (FR-14)
- Logger integration for verbose output

**Coverage**: 95%+ function coverage

#### `parser-decorator.test.ts` (2,048+ lines)
**Purpose**: Detailed decorator detection and edge case handling
**Functional Requirements**: FR-02, FR-03, FR-04
**Key Test Suites**:
- @Injectable decorator detection
- @Component decorator detection
- @Directive decorator detection
- Constructor parameter analysis
- @Inject token resolution
- Parameter decorator flags (@Optional, @Self, @SkipSelf, @Host)
- Edge cases: anonymous classes, missing types, malformed decorators

**Note**: This file was developed with TDD methodology and contains extensive tests for incremental development. May contain some overlap with `parser.test.ts`.

**Coverage**: Comprehensive edge case coverage

#### `graph-builder.test.ts` (941+ lines)
**Purpose**: Graph construction and circular dependency detection
**Functional Requirements**: FR-05, FR-11
**Key Test Suites**:
- Graph building from parsed nodes and edges (FR-05)
- Circular dependency detection and reporting (FR-11)
- Edge flags preservation (@Optional, @Self, etc.)
- Graph validation and integrity checks
- Logger integration for verbose output

**Coverage**: 95%+ function coverage

#### `graph-filter.test.ts` (317+ lines)
**Purpose**: Entry point filtering and sub-graph extraction
**Functional Requirements**: FR-07, FR-13
**Key Test Suites**:
- Entry point filtering (FR-07)
- Downstream dependency traversal
- Upstream dependency traversal (FR-13)
- Bidirectional filtering (FR-13)
- Multiple entry point handling

**Coverage**: 90%+ branch coverage

#### `formatters.test.ts` (520+ lines)
**Purpose**: JSON and Mermaid output formatting
**Functional Requirements**: FR-05, FR-06
**Key Test Suites**:
- JSON output format validation (FR-06)
- Mermaid flowchart generation (FR-06)
- Node and edge representation
- Circular dependency annotation
- Logger integration for verbose output

**Coverage**: 95%+ function coverage

#### `logger.test.ts` (317+ lines)
**Purpose**: Logger infrastructure and category management
**Functional Requirements**: FR-12 (verbose mode)
**Key Test Suites**:
- Logger creation and initialization
- Log category filtering
- Output buffering and retrieval
- Verbose mode enable/disable
- Category-specific logging (PARSER, GRAPH, TYPE_RESOLUTION, etc.)

**Coverage**: 100% line coverage

#### `type-validation.test.ts` (743+ lines)
**Purpose**: Enhanced type resolution and validation
**Functional Requirements**: FR-03, FR-09, FR-12
**Key Test Suites**:
- Complex type resolution (interfaces, type aliases, union types)
- Generic type handling
- any/unknown type detection and warnings (FR-09)
- Type resolution debugging in verbose mode (FR-12)
- Import resolution across files

**Coverage**: Comprehensive type system coverage

### Integration Test Files

#### `cli-integration.test.ts` (920+ lines)
**Purpose**: End-to-end CLI testing with all options
**Functional Requirements**: FR-01 through FR-14 (complete CLI workflow)
**Key Test Suites**:
- CLI argument parsing and validation
- Project loading via --project option
- Output format selection (--format json|mermaid)
- Entry filtering (--entry, --direction)
- Decorator flag inclusion (--include-decorators)
- Verbose mode (--verbose)
- File output (--out)
- Error handling and exit codes
- Integration with all core components

**Coverage**: End-to-end workflow validation

#### `bidirectional-filtering.test.ts` (995+ lines)
**Purpose**: Comprehensive bidirectional filtering scenarios
**Functional Requirements**: FR-07, FR-13
**Key Test Suites**:
- Downstream filtering (default)
- Upstream filtering (--direction upstream)
- Bidirectional filtering (--direction both)
- Multiple entry points
- Complex dependency chains
- Diamond dependency patterns
- Isolated subgraphs

**Coverage**: Comprehensive filtering scenario coverage

#### `verbose-e2e.test.ts` (303+ lines)
**Purpose**: End-to-end verbose mode validation
**Functional Requirements**: FR-12
**Key Test Suites**:
- Verbose output in all components (parser, graph builder, formatters)
- Type resolution debugging information
- Graph construction logging
- Output generation logging
- Integration across entire CLI workflow

**Coverage**: Verbose mode end-to-end validation

### Error Handling Test Files

#### `tests/error-handling.test.ts` (306+ lines)
**Purpose**: System-wide error handling validation
**Functional Requirements**: FR-10, FR-14
**Key Test Suites**:
- File parsing failure recovery (FR-14)
- Invalid tsconfig handling
- Missing file handling
- Type resolution errors
- Graph validation errors
- Error message clarity and actionability (FR-10)
- Non-zero exit codes on fatal failures (FR-10)

**Coverage**: Comprehensive error scenario coverage

---

## Test Helper Libraries

### `src/tests/helpers/test-utils.ts`

**Purpose**: Reusable helper functions for test setup and mocking

**Key Exports**:

#### Constants
- `TEST_FIXTURES_DIR` - Path to test fixtures directory (`./src/tests/fixtures`)
- `TEST_TSCONFIG` - Path to test tsconfig file (`./src/tests/fixtures/tsconfig.json`)

#### Helper Functions

##### `createTestCliOptions(overrides?: Partial<CliOptions>): CliOptions`
Creates default CliOptions for testing with optional overrides.

**Default Values**:
```typescript
{
  project: TEST_TSCONFIG,
  format: 'json',
  direction: 'downstream',
  includeDecorators: false,
  verbose: false
}
```

**Example Usage**:
```typescript
const options = createTestCliOptions({ verbose: true });
const parser = new AngularParser(options);
```

##### `createTestParser(optionsOverrides?: Partial<CliOptions>, loadProject = true): AngularParser`
Creates and optionally initializes an AngularParser for testing.

**Parameters**:
- `optionsOverrides` - Optional CliOptions overrides
- `loadProject` - Whether to automatically call `loadProject()` (default: true)

**Example Usage**:
```typescript
// Create parser with project loaded
const parser = createTestParser({ verbose: true });

// Create parser without loading project
const parser = createTestParser({}, false);
parser.loadProject(); // Load manually later
```

##### `createNoOpLogger(): Logger`
Creates a no-op logger that discards all output (useful for tests that don't need logging).

**Example Usage**:
```typescript
const logger = createNoOpLogger();
const parser = new AngularParser(options, logger);
```

##### `createTestGraph(): Graph`
Creates a simple test graph for filtering and traversal tests.

**Example Usage**:
```typescript
const graph = createTestGraph();
const filtered = filterByEntry(graph, ['ServiceA']);
```

### `src/tests/fixtures/sample-graphs.ts`

**Purpose**: Provides reusable graph structures for testing

**Key Exports**:

#### `createSmallTestGraph(): Graph`
Simple graph with 3 nodes and 2 edges.
**Use Case**: Basic filtering and traversal tests.

**Structure**:
```
ServiceA → ServiceB → ServiceC
```

#### `createComplexTestGraph(): Graph`
Complex graph with 10+ nodes, multiple paths, and circular dependencies.
**Use Case**: Circular dependency detection, complex filtering scenarios.

**Features**:
- Multiple dependency paths
- Circular dependencies
- Diamond dependency patterns
- Isolated subgraphs

#### `createCircularTestGraph(): Graph`
Graph specifically designed to test circular dependency detection.
**Use Case**: Circular dependency detection and reporting.

**Structure**:
```
ServiceA → ServiceB → ServiceC → ServiceA (circular)
```

#### `createBidirectionalTestGraph(): Graph`
Graph with upstream and downstream dependencies for bidirectional filtering.
**Use Case**: Bidirectional filtering tests.

**Structure**:
```
       ServiceA
         ↓   ↓
    ServiceB ServiceC
         ↓   ↓
       ServiceD
```

---

## Fixture Structure

### Test Fixtures Directory: `src/tests/fixtures/`

The fixtures directory contains sample TypeScript files that represent a realistic Angular project structure for testing.

#### Directory Structure
```
src/tests/fixtures/
├── tsconfig.json           # Test TypeScript configuration
├── sample-graphs.ts        # Reusable graph structures
└── src/
    ├── services.ts         # Sample Angular services
    ├── components.ts       # Sample Angular components
    ├── directives.ts       # Sample Angular directives
    └── edge-cases.ts       # Edge case scenarios (anonymous classes, etc.)
```

#### Fixture Files

##### `tsconfig.json`
Valid TypeScript configuration for test project.

**Key Settings**:
- `experimentalDecorators: true` - Required for Angular decorators
- `emitDecoratorMetadata: true` - Enables decorator metadata
- `target: ES2020` - Modern JavaScript target
- `include: ['src/**/*']` - Includes all source files

##### `src/services.ts`
Sample Angular services with various DI patterns.

**Contains**:
- Basic `@Injectable()` services
- Services with constructor dependencies
- Services with `@Inject(TOKEN)` tokens
- Services with parameter decorators (@Optional, @Self, etc.)

##### `src/components.ts`
Sample Angular components with DI.

**Contains**:
- `@Component()` decorated classes
- Components with service dependencies
- Components with multiple dependencies

##### `src/directives.ts`
Sample Angular directives with DI.

**Contains**:
- `@Directive()` decorated classes
- Directives with service dependencies

##### `src/edge-cases.ts`
Edge case scenarios for testing parser robustness.

**Contains**:
- Anonymous classes (should be skipped with warning)
- Classes with `any` type dependencies (should warn)
- Classes with `unknown` type dependencies (should warn)
- Malformed decorators
- Missing type annotations

---

## Running Tests

### Test Commands

All test commands use the Bun test runner for optimal performance.

#### Run All Tests
```bash
npm run test
# or
bun test
```

**Output**: Runs all tests and displays results with color-coded pass/fail status.

#### Watch Mode for TDD
```bash
npm run test:watch
# or
bun test --watch
```

**Use Case**: Continuous testing during development. Automatically re-runs tests when files change.

**Best Practice**: Keep this running in a terminal while developing with TDD methodology.

#### Coverage Report
```bash
npm run test:coverage
# or
bun test --coverage
```

**Output**: Generates detailed coverage report showing:
- Function coverage (target: ≥95%)
- Line coverage (target: ≥95%)
- Branch coverage (target: ≥90%)

**Coverage Files**: Generated in `src/tests/coverage/` directory (not committed to git).

### Test Execution Time

**Typical Performance** (on medium-sized project):
- All tests: ~15-20 seconds
- Individual test file: 1-5 seconds
- Watch mode: <1 second for incremental changes

**Performance Tips**:
- Use `bun test <filename>` to run specific test file
- Use `.only` for focused test execution during development
- Bun test runner is significantly faster than Node.js-based runners

### Validation Suite

Before committing code, run the complete validation suite:

```bash
# Run all validation checks
npm run lint          # Biome v2 linting
npm run typecheck     # TypeScript type checking
npm run test          # All tests
npm run test:coverage # Coverage validation
```

**Alternative**: Use combined check command
```bash
npm run check         # Runs lint + typecheck
```

---

## Writing New Tests

### TDD Workflow (MANDATORY)

All new features and bug fixes must follow the Test-Driven Development methodology.

**TDD Cycle**:
1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to make the test pass
3. **REFACTOR**: Improve code quality while keeping tests green
4. **REPEAT**: Continue until feature is complete

**Reference**: See @docs/rules/tdd-development-workflow.md for detailed TDD guidelines.

### Test File Organization

#### Structure for New Test Files

```typescript
/**
 * Test suite for [Component Name] - [Feature Description] (FR-XX)
 * Following TDD methodology
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ComponentUnderTest } from '../path/to/component';
import { createTestCliOptions } from './helpers/test-utils';

describe('[Component Name] - [Feature Description] (FR-XX)', () => {

  describe('[Method or Feature Group]', () => {

    it('should [expected behavior]', () => {
      // Arrange
      const input = ...;

      // Act
      const result = ...;

      // Assert
      expect(result).toEqual(expected);
    });

  });

});
```

#### Key Principles

1. **One Test File Per Component**: Each major component should have its own test file
2. **Organize by Feature**: Group tests by functional requirement or feature
3. **Use Descriptive Names**: Test descriptions should clearly state expected behavior
4. **Follow AAA Pattern**: Arrange, Act, Assert
5. **Test Public API**: Focus on public methods and behavior, not internal implementation
6. **Use Helper Functions**: Leverage test-utils.ts for common setup
7. **Include FR References**: Link tests to functional requirements in comments

### Test Naming Conventions

#### Test File Names
- Pattern: `[component-name].test.ts`
- Examples: `parser.test.ts`, `graph-builder.test.ts`, `formatters.test.ts`

#### Describe Blocks
- **Top Level**: `[ComponentName] - [Feature] (FR-XX)`
- **Nested**: `[MethodName]` or `[Feature Group]`

**Examples**:
```typescript
describe('AngularParser - Project Loading (FR-01)', () => {
  describe('loadProject() method', () => {
    // Tests for loadProject()
  });
});
```

#### Test Cases (it blocks)
- Pattern: `should [expected behavior] [when condition]`
- Use clear, actionable language
- Avoid technical jargon in descriptions

**Good Examples**:
```typescript
it('should load valid tsconfig.json without throwing')
it('should throw ParserError for non-existent tsconfig path')
it('should detect @Injectable decorator on service class')
it('should extract constructor dependencies from component')
```

**Bad Examples**:
```typescript
it('works') // Too vague
it('test loadProject') // Not descriptive
it('should call private method') // Testing implementation details
```

### Using Test Helpers

#### Setting Up Parser Tests
```typescript
import { createTestParser, createTestCliOptions } from './helpers/test-utils';

describe('Parser Tests', () => {
  it('should parse decorated classes', () => {
    // Use helper to create parser with default options
    const parser = createTestParser();

    const classes = parser.findDecoratedClasses();
    expect(classes.length).toBeGreaterThan(0);
  });

  it('should enable verbose mode', () => {
    // Override specific options
    const parser = createTestParser({ verbose: true });

    // Test verbose output
  });
});
```

#### Using Sample Graphs
```typescript
import { createComplexTestGraph } from './fixtures/sample-graphs';

describe('Graph Filter Tests', () => {
  it('should filter by entry point', () => {
    const graph = createComplexTestGraph();
    const filtered = filterByEntry(graph, ['ServiceA']);

    expect(filtered.nodes.length).toBeLessThan(graph.nodes.length);
  });
});
```

### Testing Error Conditions

**Always test error paths**:
```typescript
describe('Error Handling', () => {
  it('should throw ParserError for invalid tsconfig', () => {
    const options = createTestCliOptions({
      project: './non-existent.json'
    });

    expect(() => {
      const parser = new AngularParser(options);
      parser.loadProject();
    }).toThrow(ParserError);
  });

  it('should include helpful error message', () => {
    try {
      // Code that should throw
      failingOperation();
    } catch (error) {
      expect(error.message).toContain('helpful context');
      expect(error.message).toContain('actionable guidance');
    }
  });
});
```

### Testing with Fixtures

**Create temporary test fixtures**:
```typescript
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('File-Based Tests', () => {
  const testDir = './tmp/test-fixtures';

  beforeEach(() => {
    // Create test directory and files
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'test.ts'), 'export class Test {}');
  });

  afterEach(() => {
    // Clean up test files
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should process test files', () => {
    // Test using temporary fixtures
  });
});
```

---

## Best Practices

### General Testing Principles

1. **Test Behavior, Not Implementation**
   - Focus on public API and observable behavior
   - Avoid testing private methods directly
   - Don't couple tests to internal implementation details

2. **Keep Tests Independent**
   - Each test should be runnable in isolation
   - Use `beforeEach`/`afterEach` for setup/cleanup
   - Don't rely on test execution order

3. **Make Tests Readable**
   - Use clear, descriptive test names
   - Follow AAA pattern (Arrange, Act, Assert)
   - Keep tests short and focused
   - Extract common setup into helper functions

4. **Test Edge Cases**
   - Test with empty inputs
   - Test with invalid inputs
   - Test with boundary values
   - Test error conditions

5. **Maintain Test Quality**
   - Keep tests DRY (Don't Repeat Yourself)
   - Refactor tests along with production code
   - Use test helpers and fixtures
   - Review test coverage regularly

### ng-di-graph Specific Practices

1. **Always Reference Functional Requirements**
   ```typescript
   // Good: Clear FR reference
   describe('AngularParser - Circular Dependency Detection (FR-11)', () => {

   // Bad: No context
   describe('AngularParser', () => {
   ```

2. **Use Realistic Angular Fixtures**
   - Use fixture files that represent real Angular code patterns
   - Test with actual decorator syntax
   - Include edge cases from real-world scenarios

3. **Test CLI Integration**
   - Test complete workflows end-to-end
   - Validate CLI argument parsing
   - Check exit codes and error messages
   - Test output formats (JSON and Mermaid)

4. **Validate Type Resolution**
   - Test with complex TypeScript types
   - Test with any/unknown types
   - Test with import resolution
   - Test verbose mode type debugging

5. **Test Performance**
   - Include performance assertions for critical paths
   - Test with large graphs (100+ nodes)
   - Validate memory usage doesn't grow excessively
   - Ensure tests complete in reasonable time (<10s per file)

### Code Coverage Guidelines

**Minimum Coverage Targets**:
- Function coverage: **≥95%**
- Line coverage: **≥95%**
- Branch coverage: **≥90%**

**Exceptions**:
- Error handling paths that are difficult to trigger
- Deprecated code paths
- Debug logging code

**Coverage Validation**:
```bash
npm run test:coverage
```

**Review Coverage Report**:
- Check `src/tests/coverage/` directory
- Identify uncovered code paths
- Add tests for critical uncovered paths
- Document legitimate coverage exceptions

---

## Troubleshooting

### Common Test Issues

#### Issue: Tests Pass Individually but Fail Together
**Cause**: Tests are not properly isolated; shared state between tests

**Solution**:
- Use `beforeEach`/`afterEach` for setup/teardown
- Avoid global state modifications
- Reset mocks and test data between tests
- Use separate test fixtures for each test

#### Issue: Slow Test Execution
**Cause**: Tests are doing too much work or not optimized

**Solution**:
- Use Bun test runner (not Node.js jest/mocha)
- Avoid unnecessary file I/O in tests
- Mock external dependencies
- Run specific test files during development: `bun test parser.test.ts`
- Use `.only` for focused test execution

#### Issue: Flaky Tests (Sometimes Pass, Sometimes Fail)
**Cause**: Race conditions, timing dependencies, or environmental factors

**Solution**:
- Avoid timing-dependent assertions
- Use deterministic test data
- Ensure proper test isolation
- Check for async/await issues
- Use `beforeEach` to reset state

#### Issue: Coverage Report Not Generated
**Cause**: Coverage output directory not writable

**Solution**:
```bash
# Clean coverage directory
rm -rf src/tests/coverage

# Re-run with coverage
npm run test:coverage
```

#### Issue: TypeScript Errors in Test Files
**Cause**: Missing type definitions or incorrect imports

**Solution**:
- Run `npm run typecheck` to identify type errors
- Ensure all imports are correct
- Check that `@types/bun` is installed
- Verify tsconfig.json includes test files

#### Issue: Tests Can't Find Fixtures
**Cause**: Incorrect fixture paths or missing fixture files

**Solution**:
- Use `TEST_FIXTURES_DIR` constant from test-utils.ts
- Verify fixture files exist in `src/tests/fixtures/`
- Use absolute paths for fixture references
- Check file permissions

### Debugging Tests

#### Enable Verbose Test Output
```bash
bun test --verbose
```

#### Run Specific Test File
```bash
bun test src/tests/parser.test.ts
```

#### Run Specific Test Case
```typescript
// Use .only to focus on one test
it.only('should do something specific', () => {
  // This test will run in isolation
});
```

#### Debug with Console Output
```typescript
it('should debug issue', () => {
  const result = someOperation();
  console.log('Debug result:', result); // Will show in test output
  expect(result).toBe(expected);
});
```

#### Check Test Execution Time
```bash
# Bun shows execution time for each test file
bun test
```

### Getting Help

#### Documentation References
- **TDD Workflow**: @docs/rules/tdd-development-workflow.md
- **AI Development Guide**: @docs/rules/ai-development-guide.md
- **MVP Requirements**: @docs/prd/mvp-requirements.md
- **Project README**: README.md

#### Reporting Test Issues
When reporting test failures or issues:
1. Include full error message and stack trace
2. Specify which test file and test case is failing
3. Provide steps to reproduce
4. Note your Bun version: `bun --version`
5. Include relevant system information (OS, Node version if applicable)

---

## Summary

The ng-di-graph test suite is comprehensively organized to validate all functional requirements (FR-01 through FR-14) with high coverage and quality. Key points:

- **11 test files** covering unit, integration, and E2E testing
- **95%+ coverage** for critical components
- **TDD methodology** mandatory for all new development
- **Helper libraries** for consistent test setup
- **Realistic fixtures** representing Angular code patterns
- **Fast execution** with Bun test runner (~15-20 seconds for full suite)

**Always follow TDD workflow**: Write tests first, implement minimal code, refactor, repeat.

---

**Next Steps**:
1. Review this documentation when writing new tests
2. Run `npm run test:watch` during TDD development
3. Check coverage with `npm run test:coverage` before committing
4. Reference functional requirements (FR-XX) in test descriptions
5. Use test helpers from `test-utils.ts` for consistency

**Questions?** See troubleshooting section or consult the AI Development Guide.
