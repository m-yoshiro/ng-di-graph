# Task 1.1: FR-01 - ts-morph Project Loading

**Milestone**: 1 - Core Foundation  
**Priority**: High  
**Dependencies**: None  
**Functional Requirement**: FR-01 - Parse the `--project` tsconfig and load its program with ts-morph  
**TDD Focus**: Test tsconfig loading, validation, and error handling

## Overview
Implement robust tsconfig.json loading and validation using ts-morph. This is the foundation task that enables all subsequent parsing operations.

## TDD Implementation Steps

### 1. Write Tests First (RED Phase)
Create comprehensive test cases in `tests/parser.test.ts`:

```typescript
describe('AngularParser - Project Loading', () => {
  const validTsConfig = './tsconfig.json';
  const invalidPath = './non-existent-tsconfig.json';
  
  it('should load valid tsconfig.json', () => {
    const parser = new AngularParser({ project: validTsConfig, ... });
    expect(() => parser.loadProject()).not.toThrow();
  });
  
  it('should throw error for invalid tsconfig path', () => {
    const parser = new AngularParser({ project: invalidPath, ... });
    expect(() => parser.loadProject()).toThrow('tsconfig.json not found');
  });
  
  it('should throw error for malformed tsconfig', () => {
    // Create malformed tsconfig test fixture
    const parser = new AngularParser({ project: './malformed-tsconfig.json', ... });
    expect(() => parser.loadProject()).toThrow('Invalid tsconfig.json');
  });
  
  it('should handle missing tsconfig gracefully', () => {
    const parser = new AngularParser({ project: './missing.json', ... });
    expect(() => parser.loadProject()).toThrow();
    // Should exit with code 1 (tested at CLI level)
  });
});
```

### 2. Implement loadProject() Method (GREEN Phase)
Update `src/core/parser.ts`:

```typescript
import { Project } from 'ts-morph';
import { existsSync } from 'fs';
import { CliOptions } from '../types';

export class AngularParser {
  private _project?: Project;

  constructor(private _options: CliOptions) {}

  loadProject(): void {
    // Validate tsconfig path exists
    if (!existsSync(this._options.project)) {
      throw new Error(`tsconfig.json not found at: ${this._options.project}`);
    }

    try {
      // Load Project with ts-morph
      this._project = new Project({
        tsConfigFilePath: this._options.project,
      });

      // Validate project loaded successfully
      if (!this._project) {
        throw new Error('Failed to load TypeScript project');
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Invalid tsconfig.json: ${error.message}`);
      }
      throw new Error('Failed to load TypeScript project');
    }
  }

  getProject(): Project {
    if (!this._project) {
      throw new Error('Project not loaded. Call loadProject() first.');
    }
    return this._project;
  }

  async parseClasses(): Promise<ParsedClass[]> {
    if (!this._project) {
      this.loadProject();
    }
    throw new Error('Not implemented yet');
  }
}
```

### 3. Refactor (REFACTOR Phase)
- Add proper error messages for different failure scenarios
- Ensure clean separation of concerns
- Add logging support for verbose mode
- Validate TypeScript compilation errors

## Implementation Details

### Files to Modify
- `src/core/parser.ts` - Main implementation
- `tests/parser.test.ts` - Test cases
- `src/cli/index.ts` - Integration and error handling

### Error Handling Requirements
From PRD Section 13:
- Missing/invalid tsconfig → Abort, exit 1, print error
- Compilation errors → Clear error message with file details
- Memory constraints → Helpful error message

### Integration with CLI
Update CLI to handle errors properly:
```typescript
// src/cli/index.ts
try {
  const parser = new AngularParser(options);
  parser.loadProject();
  // Continue with parsing...
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
```

## Acceptance Criteria
- [ ] Valid tsconfig loads successfully without errors
- [ ] Invalid/missing tsconfig exits with code 1
- [ ] Clear error messages for all failure cases:
  - [ ] File not found
  - [ ] Malformed JSON
  - [ ] Invalid TypeScript configuration
  - [ ] Compilation errors
- [ ] Test coverage >90% for this module
- [ ] No memory leaks in project loading
- [ ] Proper integration with CLI error handling

## Success Metrics
- **Test Coverage**: >90% for parser.ts project loading methods
- **Error Handling**: All PRD error cases covered
- **Performance**: Project loading completes in <2 seconds for typical projects
- **Integration**: Clean integration with CLI argument parsing

## Next Task
Upon completion, proceed to **Task 1.2: Class Collection** which depends on successful project loading.