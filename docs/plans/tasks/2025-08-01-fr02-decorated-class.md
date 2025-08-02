# Implementation Plan: FR-02 Decorated Class Collection

**Created by**: implementation-planner  
**Executed by**: implementation-executor  
**Date**: 2025-08-01  
**Version**: v0.1  
**Status**: Planning

---

## 1. Overview

### Feature/Task Description
Implement the `findDecoratedClasses()` method in AngularParser to detect and collect Angular decorated classes using ts-morph AST analysis. This method must identify classes decorated with `@Injectable`, `@Component`, or `@Directive` and map them to the correct `NodeKind`.

**Goal**: Complete implementation of FR-02 with robust decorator detection, proper error handling, and comprehensive test coverage following TDD methodology.

**Scope**: 
- **Included**: Decorator detection, NodeKind mapping, file path recording, anonymous class handling, import variation support
- **Excluded**: Constructor dependency parsing (Task 1.3), graph building (Task 2.1), circular dependency detection (Task 4.3)

**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#6-functional-requirements (FR-02)
- **Related Documentation**: @docs/rules/ai-development-guide.md
- **Dependencies**: Task 1.1 (Project Loading) - AngularParser.loadProject() is completed and tested
- **Architecture**: Uses ts-morph AST parsing to analyze TypeScript source files

---

## 2. Technical Approach

### Architecture Decisions
**Design Pattern**: Strategy pattern for decorator detection with factory method for NodeKind determination

**Technology Stack**: 
- ts-morph for TypeScript AST analysis
- Vitest for TDD test framework
- Built-in Node.js path utilities for file path handling

**Integration Points**:
- Extends existing AngularParser class with new `findDecoratedClasses()` method
- Integrates with existing project loading via `getProject()` method
- Uses existing `ParsedClass` type from `src/types/index.ts`

### File Structure
```
src/
├── core/
│   └── parser.ts              # Add findDecoratedClasses() and helper methods
└── types/
    └── index.ts               # No changes needed - types already defined

tests/
├── parser.test.ts             # Add new test suite for decorator collection
└── fixtures/
    ├── decorated-classes.ts   # Test fixture with decorated classes
    ├── mixed-imports.ts       # Test various import patterns
    ├── anonymous-classes.ts   # Test anonymous class handling
    └── tsconfig.json          # Test project configuration
```

### Data Flow
1. **Input**: Loaded ts-morph Project instance from `getProject()`
2. **Processing**: 
   - Iterate through all source files in project
   - Extract class declarations from each file
   - Analyze decorators for each class
   - Map decorator names to NodeKind values
   - Handle edge cases (anonymous classes, malformed decorators)
3. **Output**: Array of `ParsedClass` objects with name, kind, filePath, and empty dependencies array

---

## 3. Implementation Tasks

### Phase 1: Test Infrastructure Setup
**Priority**: High  
**Estimated Duration**: 30 minutes

- [ ] **Task 1.1**: Create test fixture files
  - **TDD Approach**: Setup test data before writing failing tests
  - **Implementation**: Create TypeScript files with various decorator patterns in `tests/fixtures/`
  - **Acceptance Criteria**: Test fixtures cover all decorator types and edge cases

- [ ] **Task 1.2**: Setup test project configuration
  - **TDD Approach**: Configure test tsconfig.json for fixtures
  - **Implementation**: Create minimal tsconfig.json that includes test fixtures
  - **Acceptance Criteria**: Test project loads without compilation errors

### Phase 2: RED Phase - Write Failing Tests
**Priority**: High  
**Estimated Duration**: 45 minutes

- [ ] **Task 2.1**: Write basic decorator detection tests
  - **TDD Approach**: Test that `findDecoratedClasses()` method exists and returns expected structure
  - **Implementation**: Test for @Injectable, @Component, @Directive detection
  - **Acceptance Criteria**: Tests fail with "Not implemented" or similar errors

- [ ] **Task 2.2**: Write NodeKind mapping tests
  - **TDD Approach**: Test correct mapping from decorators to NodeKind enum values
  - **Implementation**: Verify 'service', 'component', 'directive' mapping accuracy
  - **Acceptance Criteria**: Tests validate proper type discrimination

- [ ] **Task 2.3**: Write edge case handling tests
  - **TDD Approach**: Test anonymous class warning, undecorated class skipping
  - **Implementation**: Verify graceful handling of problematic code patterns
  - **Acceptance Criteria**: Tests confirm robust error handling without crashes

### Phase 3: GREEN Phase - Minimal Implementation
**Priority**: High  
**Estimated Duration**: 60 minutes

- [ ] **Task 3.1**: Implement core `findDecoratedClasses()` method
  - **TDD Approach**: Write minimal code to make basic tests pass
  - **Implementation**: Source file iteration, class extraction, decorator analysis
  - **Acceptance Criteria**: Basic decorator detection tests pass

- [ ] **Task 3.2**: Implement `determineNodeKind()` helper method
  - **TDD Approach**: Focus on making NodeKind mapping tests pass
  - **Implementation**: Switch-case logic for decorator name to NodeKind mapping
  - **Acceptance Criteria**: All decorator type mapping tests pass

- [ ] **Task 3.3**: Implement `parseClassDeclaration()` helper method
  - **TDD Approach**: Make individual class processing tests pass
  - **Implementation**: Class name extraction, decorator analysis, ParsedClass creation
  - **Acceptance Criteria**: Class-level processing tests pass

### Phase 4: REFACTOR Phase - Enhancement & Optimization
**Priority**: Medium  
**Estimated Duration**: 45 minutes

- [ ] **Task 4.1**: Add import pattern support
  - **TDD Approach**: Write tests for various import styles first
  - **Implementation**: Enhanced decorator name resolution for aliased imports
  - **Acceptance Criteria**: Handles `import * as ng`, aliased imports correctly

- [ ] **Task 4.2**: Add verbose logging support
  - **TDD Approach**: Test that verbose mode outputs expected information
  - **Implementation**: Conditional logging based on CLI options
  - **Acceptance Criteria**: Detailed parsing information available in verbose mode

- [ ] **Task 4.3**: Performance optimization
  - **TDD Approach**: Add performance benchmarks as tests
  - **Implementation**: Optimize file processing, add early returns for non-Angular files
  - **Acceptance Criteria**: Processes 100+ classes in <1 second

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md

**Test Categories**:
- **Unit Tests**: Individual method behavior (findDecoratedClasses, determineNodeKind, parseClassDeclaration)
- **Integration Tests**: Full decorator collection workflow with various file types
- **Edge Case Tests**: Anonymous classes, malformed decorators, import variations

### Test Implementation Order
1. **Red Phase**: Write comprehensive failing tests covering all scenarios
2. **Green Phase**: Implement minimal code to pass tests
3. **Refactor Phase**: Optimize implementation while maintaining test coverage

### Test Files Structure
```
tests/
├── parser.test.ts              # Main test suite with decorator collection tests
├── fixtures/
│   ├── decorated-classes.ts    # Standard @Injectable/@Component/@Directive classes
│   ├── mixed-imports.ts        # Various import patterns and aliases  
│   ├── anonymous-classes.ts    # Anonymous classes and edge cases
│   ├── undecorated-classes.ts  # Plain classes that should be ignored
│   └── tsconfig.json           # Test project configuration
└── performance/
    └── decorator-benchmark.ts  # Performance validation tests
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
// All types already defined in src/types/index.ts
interface ParsedClass {
  name: string;
  kind: NodeKind;
  filePath: string;
  dependencies: ParsedDependency[]; // Empty array for this task
}

type NodeKind = 'service' | 'component' | 'directive' | 'unknown';
```

### API Design
```typescript
// Public API additions to AngularParser class
class AngularParser {
  // Main method for decorator collection
  public findDecoratedClasses(): ParsedClass[];
  
  // Helper methods (private)
  private parseClassDeclaration(classDecl: ClassDeclaration): ParsedClass | null;
  private determineNodeKind(decorators: Decorator[]): NodeKind;
  private getDecoratorName(decorator: Decorator): string;
  private shouldProcessFile(sourceFile: SourceFile): boolean; // Performance optimization
}
```

### Configuration
- **Environment Variables**: None required
- **Config Files**: Uses existing tsconfig.json from CLI options
- **Default Values**: Skip anonymous classes with warning, default to 'unknown' NodeKind for unrecognized decorators

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Anonymous Class Detection**: Log warning with file path, skip processing, continue execution
- **Malformed Decorator Syntax**: Log warning, treat as undecorated class, continue processing
- **Import Resolution Failure**: Skip decorator name resolution, default to 'unknown' kind
- **File Processing Error**: Log error with file path, skip file, continue with other files

### Edge Cases
- **Multiple Decorators**: Use first recognized Angular decorator for NodeKind determination
- **Aliased Imports**: Support `import { Injectable as Service }` and `import * as ng` patterns
- **Generic Decorators**: Handle `@Injectable<T>()` and similar generic decorator usage
- **Non-Angular Decorators**: Ignore decorators not from @angular/core, continue processing

### Validation Requirements
- **Input Validation**: Verify Project instance is loaded before processing
- **Output Validation**: Ensure all returned ParsedClass objects have valid name, kind, and filePath

---

## 7. Performance Considerations

### Performance Requirements
- **Target Metrics**: Process 100+ decorated classes in <1 second
- **Bottlenecks**: File system I/O, AST parsing overhead, decorator name resolution
- **Optimization Strategy**: Early file filtering, cached decorator lookups, parallel file processing

### Memory Management
- **Memory Usage**: Minimize AST node retention, process files sequentially to control memory
- **Large Dataset Handling**: Consider streaming processing for projects with 1000+ files

---

## 8. Progress Tracking

### Milestones
- [ ] **Milestone 1**: Test Infrastructure Complete - Target: 30 minutes
  - [ ] All test fixtures created and loading properly
  - [ ] Test project configuration working
  
- [ ] **Milestone 2**: RED Phase Complete - Target: +45 minutes (1h 15m total)  
  - [ ] All failing tests written and documented
  - [ ] Test coverage plan established
  
- [ ] **Milestone 3**: GREEN Phase Complete - Target: +60 minutes (2h 15m total)
  - [ ] All tests passing with minimal implementation
  - [ ] Core functionality working correctly
  
- [ ] **Milestone 4**: REFACTOR Phase Complete - Target: +45 minutes (3h total)
  - [ ] Enhanced implementation with optimizations
  - [ ] Performance targets met

### Progress Updates
<!-- Updated by implementation-executor during execution -->
**Last Updated**: [Date]  
**Current Status**: Planning phase complete, ready for execution  
**Blockers**: None identified  
**Next Steps**: Begin test fixture creation (Task 1.1)

---

## 9. Definition of Done

### Completion Criteria
- [ ] `findDecoratedClasses()` method implemented and working
- [ ] All test suites passing (unit, integration, edge cases)
- [ ] Performance requirement met (<1 second for 100+ classes)
- [ ] Anonymous class warning functionality working
- [ ] Support for standard decorator import patterns
- [ ] File path correctly recorded for each class

### Acceptance Testing
- [ ] **Functional Requirements**: FR-02 completely implemented
  - [ ] @Injectable classes detected as 'service' NodeKind
  - [ ] @Component classes detected as 'component' NodeKind
  - [ ] @Directive classes detected as 'directive' NodeKind
  - [ ] Undecorated classes properly ignored
- [ ] **Non-Functional Requirements**: Performance and robustness verified
- [ ] **Edge Cases**: Anonymous classes, malformed decorators handled gracefully

### Code Quality Checks
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes  
- [ ] `npm run test` all tests pass
- [ ] Code coverage >90% for decorator collection logic
- [ ] No memory leaks or performance degradation

---

## 10. Risk Assessment

### High Risk Items
- **Risk 1**: Complex decorator import patterns not handled correctly
  - **Mitigation**: Create comprehensive test fixtures covering all import variations
- **Risk 2**: Performance degradation on large codebases
  - **Mitigation**: Implement early file filtering and benchmark with realistic test data

### Dependencies & Blockers
- **External Dependencies**: ts-morph API compatibility, TypeScript version compatibility
- **Internal Dependencies**: Task 1.1 (Project Loading) must be working correctly

### Contingency Plans
- **Plan A**: Use ts-morph decorator APIs for comprehensive decorator analysis
- **Plan B**: Fall back to simpler text-based decorator detection if AST analysis fails

---

## 11. Notes & Decisions

### Implementation Notes
- **Decorator Detection**: Use ts-morph's Decorator.getCallExpression() for robust decorator name extraction
- **Performance Optimization**: Add `shouldProcessFile()` check to skip obviously non-Angular files
- **Error Resilience**: Use try-catch blocks around individual file processing to prevent cascade failures
- **Logging Strategy**: Implement conditional verbose logging that doesn't impact performance

### Decision Log
- **Decision 1**: Skip anonymous classes with warning rather than failing - provides better user experience
- **Decision 2**: Return 'unknown' NodeKind for unrecognized decorators - allows future extension
- **Decision 3**: Process files sequentially initially - can optimize to parallel processing later if needed

### Questions for Executor
- Should we cache decorator name resolution results for better performance?
- Should verbose mode output include file-by-file processing statistics?
- How should we handle decorator inheritance patterns (if encountered)?

---

## 12. Resources & References

### Documentation
- **Requirements**: @docs/prd/mvp-requirements.md#6-functional-requirements (FR-02)
- **Workflow**: @docs/rules/tdd-development-workflow.md
- **Architecture**: @docs/rules/ai-development-guide.md

### External Resources
- [ts-morph Decorator API Documentation](https://ts-morph.com/details/decorators)
- [TypeScript AST Viewer](https://ts-ast-viewer.com/) for understanding AST structure
- [Angular Decorator Documentation](https://angular.io/guide/architecture-overview#decorators)

### Code Examples
- **Existing Implementation**: `src/core/parser.ts` (loadProject method as reference)
- **Type Definitions**: `src/types/index.ts` (ParsedClass, NodeKind interfaces)
- **Test Patterns**: `tests/parser.test.ts` (existing project loading tests as examples)