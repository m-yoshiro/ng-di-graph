# Angular DI Dependency Graph CLI - Implementation Plan

**Project**: ng-di-graph  
**Version**: MVP v0.1  
**Date**: 2025-07-31  
**Methodology**: Test-Driven Development (TDD) - MANDATORY

---

## Executive Summary

This implementation plan breaks down all 14 functional requirements (FR-01 through FR-14) from the PRD into specific, actionable tasks following mandatory TDD methodology. The plan is structured in 5 milestones with clear dependencies, acceptance criteria, and tracking mechanisms.

**Key Success Metrics:**
- All 14 functional requirements implemented and tested
- >70% test coverage across all components (NFR-04)
- Performance target: <10 seconds on medium-sized projects (NFR-01)
- TDD cycle followed for every feature implementation

---

## Implementation Strategy

### TDD Methodology (MANDATORY)
Every implementation task MUST follow this cycle:
1. **RED**: Write failing test first (`npm run test:watch`)
2. **GREEN**: Write minimal code to pass test
3. **REFACTOR**: Improve code while keeping tests green
4. **REPEAT**: Continue until feature is complete

### Project Architecture Mapping
The implementation leverages the existing code structure:
- `src/core/parser.ts` → AST parsing and decorated class collection
- `src/core/graph-builder.ts` → In-memory graph construction
- `src/formatters/` → JSON and Mermaid output formatting
- `src/cli/index.ts` → Command-line interface and option handling
- `src/types/index.ts` → Type definitions (already complete)

---

## MILESTONE 1: Core Foundation
**Duration**: 2-3 days  
**Dependencies**: None  
**Success Criteria**: Basic parsing pipeline working with TDD coverage

### Task 1.1: FR-01 - ts-morph Project Loading
**Priority**: High  
**TDD Focus**: Test tsconfig loading, validation, and error handling

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   // tests/parser.test.ts
   describe('AngularParser - Project Loading', () => {
     it('should load valid tsconfig.json')
     it('should throw error for invalid tsconfig path')
     it('should throw error for malformed tsconfig')
     it('should handle missing tsconfig gracefully')
   })
   ```

2. **Implement `AngularParser.loadProject()`**:
   - Validate tsconfig path exists
   - Load Project with ts-morph
   - Handle compilation errors
   - Provide clear error messages

3. **Acceptance Criteria**:
   - [ ] Valid tsconfig loads successfully
   - [ ] Invalid/missing tsconfig exits with code 1
   - [ ] Clear error messages for all failure cases
   - [ ] Test coverage >90% for this module

### Task 1.2: FR-02 - Decorated Class Collection
**Priority**: High  
**Dependencies**: Task 1.1  
**TDD Focus**: Test decorator detection and class collection

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('AngularParser - Class Collection', () => {
     it('should find @Injectable classes')
     it('should find @Component classes')
     it('should find @Directive classes')
     it('should skip undecorated classes')
     it('should handle anonymous classes gracefully')
   })
   ```

2. **Implement `AngularParser.findDecoratedClasses()`**:
   - Use ts-morph to find classes with specific decorators
   - Extract class names and determine NodeKind
   - Skip anonymous classes with warning
   - Handle decorator import variations

3. **Acceptance Criteria**:
   - [ ] All three decorator types detected correctly
   - [ ] Anonymous classes skipped with warning
   - [ ] NodeKind correctly determined for each class type
   - [ ] Test coverage >90%

### Task 1.3: FR-03 - Constructor Token Resolution
**Priority**: High  
**Dependencies**: Task 1.2  
**TDD Focus**: Test parameter type resolution and @Inject handling

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('AngularParser - Token Resolution', () => {
     it('should resolve type annotation tokens')
     it('should resolve @Inject tokens')
     it('should handle primitive types')
     it('should skip any/unknown types with warning')
   })
   ```

2. **Implement `AngularParser.resolveConstructorTokens()`**:
   - Parse constructor parameters
   - Extract type information from annotations
   - Handle @Inject decorator tokens
   - Validate and filter token types

3. **Acceptance Criteria**:
   - [ ] Type annotations resolved correctly
   - [ ] @Inject tokens extracted properly
   - [ ] any/unknown types skipped with warnings
   - [ ] Test coverage >90%

---

## MILESTONE 2: Core Features
**Duration**: 2-3 days  
**Dependencies**: Milestone 1 complete  
**Success Criteria**: Basic graph generation and output working

### Task 2.1: FR-05 - Graph Building Infrastructure ✅ COMPLETED
**Priority**: High  
**Dependencies**: All Milestone 1 tasks  
**Completion Date**: 2025-08-12

#### Implementation Results:
1. **Tests Implemented**: 68 tests passing with 99.19% line coverage
2. **Core Implementation**: `GraphBuilder.buildGraph()` with robust error handling
3. **Features Delivered**:
   - Graph construction from ParsedClass[] 
   - Circular dependency detection (FR-11)
   - Input validation and graceful error handling
   - Performance optimized for 1000+ nodes (<100ms)

4. **Acceptance Criteria**:
   - [x] Correct node creation from parsed classes
   - [x] Proper edge generation from dependencies
   - [x] No duplicate nodes in output
   - [x] Test coverage >90% (achieved 99.19%)
   - [x] Circular dependency detection implemented
   - [x] Input validation and error handling

### Task 2.2: FR-06 & FR-08 - Output Formatting and File Handling ✅ COMPLETED
**Priority**: Medium  
**Dependencies**: Task 2.1  
**Completion Date**: 2025-01-14

#### Implementation Results:
1. **Tests Implemented**: 16 comprehensive tests with 99.84% line coverage
2. **Core Implementation**: 
   - JSON formatter with pretty-printing
   - Mermaid formatter with special character sanitization and circular dependency notation
   - Output handler with file I/O and directory creation
   - CLI integration
3. **Features Delivered**:
   - Complete output pipeline supporting JSON and Mermaid formats
   - File and stdout output options with robust error handling
   - Performance optimized: 0.76ms JSON, 3.85ms Mermaid for large graphs
   - Production-ready with comprehensive test coverage

4. **Acceptance Criteria**:
   - [x] JSON output matches specification format exactly
   - [x] Mermaid output is valid and renders correctly in Live Editor
   - [x] File output works correctly with directory creation
   - [x] stdout output works correctly (default behavior)
   - [x] Special characters in node names handled properly
   - [x] Circular dependencies marked appropriately in Mermaid
   - [x] Empty graphs handled gracefully in both formats
   - [x] Test coverage >90% (achieved 99.84%)

### Task 2.3: FR-04 - Parameter Decorator Handling
**Priority**: Medium  
**Dependencies**: Task 1.3  

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('Parameter Decorators', () => {
     it('should detect @Optional decorator')
     it('should detect @Self decorator')
     it('should detect @SkipSelf decorator')
     it('should detect @Host decorator')
     it('should only include flags when --include-decorators set')
   })
   ```

2. **Implement Decorator Detection**:
   - Extend token resolution to detect parameter decorators
   - Map decorators to EdgeFlags
   - Respect --include-decorators option
   - Add to edge creation logic

3. **Acceptance Criteria**:
   - [ ] All four decorator types detected
   - [ ] Flags only included when option set
   - [ ] Correct EdgeFlags mapping
   - [ ] Test coverage >90%

---

## MILESTONE 3: Advanced Features
**Duration**: 2 days  
**Dependencies**: Milestone 2 complete  
**Success Criteria**: Entry filtering and advanced graph operations working

### Task 3.1: FR-07 - Entry Point Filtering
**Priority**: Medium  
**Dependencies**: Task 2.1  

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('Entry Filtering', () => {
     it('should filter downstream dependencies correctly')
     it('should handle multiple entry points')
     it('should return empty graph for non-existent entries')
     it('should preserve dependency relationships in subgraph')
   })
   ```

2. **Implement Graph Filtering**:
   - Add graph traversal algorithms (DFS/BFS)
   - Implement downstream filtering
   - Handle multiple entry points
   - Preserve relationship integrity

3. **Acceptance Criteria**:
   - [ ] Correct subgraph extraction
   - [ ] Multiple entry points supported
   - [ ] Dependency relationships preserved
   - [ ] Test coverage >90%

### Task 3.2: FR-13 - Bidirectional Filtering
**Priority**: Medium  
**Dependencies**: Task 3.1  

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('Bidirectional Filtering', () => {
     it('should filter upstream dependencies')
     it('should filter both directions')
     it('should default to downstream')
     it('should handle circular references in filtering')
   })
   ```

2. **Implement Direction Support**:
   - Add upstream traversal
   - Add bidirectional traversal
   - Integrate with CLI --direction option
   - Handle edge cases

3. **Acceptance Criteria**:
   - [ ] All three directions work correctly
   - [ ] Proper default behavior
   - [ ] Circular references handled
   - [ ] Test coverage >90%

### Task 3.3: FR-09 - Type Validation and Warnings
**Priority**: Medium  
**Dependencies**: Task 1.3  

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('Type Validation', () => {
     it('should skip any types with warning')
     it('should skip unknown types with warning')
     it('should continue processing after skipping')
     it('should log appropriate warning messages')
   })
   ```

2. **Implement Type Filtering**:
   - Add type validation logic
   - Implement warning system
   - Ensure graceful continuation
   - Add logging infrastructure

3. **Acceptance Criteria**:
   - [ ] any/unknown types properly skipped
   - [ ] Appropriate warnings logged
   - [ ] Processing continues normally
   - [ ] Test coverage >90%

---

## MILESTONE 4: Error Handling and Robustness
**Duration**: 1-2 days  
**Dependencies**: Milestone 3 complete  
**Success Criteria**: Robust error handling with proper exit codes

### Task 4.1: FR-10 - Comprehensive Error Handling
**Priority**: Medium  
**Dependencies**: All core functionality  

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('Error Handling', () => {
     it('should exit with code 1 on fatal errors')
     it('should provide clear error messages')
     it('should handle missing tsconfig properly')
     it('should handle compilation errors')
   })
   ```

2. **Implement Error System**:
   - Add comprehensive error handling
   - Implement proper exit codes
   - Add clear error messaging
   - Handle all specified error cases

3. **Acceptance Criteria**:
   - [ ] All error cases from PRD section 13 handled
   - [ ] Proper exit codes for all scenarios
   - [ ] Clear, actionable error messages
   - [ ] Test coverage >90%

### Task 4.2: FR-14 - Graceful Error Recovery
**Priority**: Medium  
**Dependencies**: Task 4.1  

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('Error Recovery', () => {
     it('should continue processing after file parse failure')
     it('should log warnings for failed files')
     it('should produce partial graph on partial failure')
     it('should not crash on individual file errors')
   })
   ```

2. **Implement Recovery Logic**:
   - Add try-catch blocks for individual file processing
   - Implement warning system for partial failures
   - Ensure overall process continuation
   - Maintain data integrity

3. **Acceptance Criteria**:
   - [ ] Individual file failures don't stop processing
   - [ ] Warnings logged for failed files
   - [ ] Partial graphs generated correctly
   - [ ] Test coverage >90%

### Task 4.3: FR-11 - Circular Dependency Detection
**Priority**: Medium  
**Dependencies**: Task 2.1  

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('Circular Dependencies', () => {
     it('should detect simple circular dependencies')
     it('should detect complex circular chains')
     it('should report all circular paths')
     it('should continue processing after detection')
   })
   ```

2. **Implement Cycle Detection**:
   - Add graph cycle detection algorithm
   - Report circular dependencies in output
   - Mark circular edges appropriately
   - Ensure processing continues

3. **Acceptance Criteria**:
   - [ ] All circular dependencies detected
   - [ ] Proper reporting in output format
   - [ ] isCircular flag set on edges
   - [ ] Test coverage >90%

---

## MILESTONE 5: Polish and Debugging Features
**Duration**: 1 day  
**Dependencies**: Milestone 4 complete  
**Success Criteria**: Complete feature set with debugging support

### Task 5.1: FR-12 - Verbose Mode Implementation
**Priority**: Low  
**Dependencies**: All core functionality  

#### Implementation Steps:
1. **Write Tests First**:
   ```typescript
   describe('Verbose Mode', () => {
     it('should output detailed parsing information')
     it('should show type resolution details')
     it('should log processing steps')
     it('should only activate with --verbose flag')
   })
   ```

2. **Implement Verbose Logging**:
   - Add detailed logging throughout pipeline
   - Show type resolution process
   - Log processing statistics
   - Respect --verbose flag

3. **Acceptance Criteria**:
   - [ ] Detailed information available in verbose mode
   - [ ] No verbose output without flag
   - [ ] Useful for debugging type resolution issues
   - [ ] Test coverage >80%

---

## Quality Assurance Integration

### Test Coverage Requirements
- **Target**: >70% overall coverage (NFR-04)
- **Critical Modules**: >90% coverage for parser, graph-builder
- **Tracking**: Use `npm run test:coverage` for monitoring

### Performance Testing
- **Target**: <10 seconds on medium-sized projects (NFR-01)
- **Test Data**: Create sample Angular projects of varying sizes
- **Monitoring**: Add performance benchmarks to test suite

### Integration Testing
```typescript
describe('End-to-End Integration', () => {
  it('should process complete Angular project')
  it('should generate valid JSON output')
  it('should generate valid Mermaid output')
  it('should handle all CLI options correctly')
})
```

---

## Risk Mitigation Strategies

### Technical Risks
1. **ts-morph Version Compatibility**: Lock dependency versions, test in CI
2. **Memory Issues on Large Codebases**: Implement streaming parsing, add memory monitoring
3. **Complex Type Resolution**: Start with simple cases, incrementally add complexity
4. **Mermaid Format Validation**: Test with Mermaid Live Editor during development

### Process Risks
1. **TDD Discipline**: Use test:watch mode continuously, pair programming for enforcement
2. **Scope Creep**: Stick to MVP requirements, defer enhancements to future releases
3. **Integration Complexity**: Implement modules independently, test integration frequently

---

## Success Criteria and Acceptance

### Functional Acceptance
- [ ] All FR-01 through FR-14 requirements implemented
- [ ] All test cases TC-01 through TC-10 passing
- [ ] CLI help displays all options correctly
- [ ] JSON output matches specification exactly
- [ ] Mermaid output renders correctly in Live Editor

### Non-Functional Acceptance
- [ ] Performance target met on sample projects
- [ ] Test coverage >70% overall
- [ ] No OS-specific dependencies
- [ ] Clean TypeScript compilation
- [ ] All linting rules pass

### Documentation Completion
- [ ] README with usage examples (if requested)
- [ ] API documentation for core modules
- [ ] Test case documentation
- [ ] Performance benchmarking results

---

## Next Steps

1. **Start with MILESTONE 1**: Begin TDD implementation of core parsing
2. **Use Todo Tracking**: Update todo list as tasks progress
3. **Continuous Integration**: Run tests after each green phase
4. **Milestone Reviews**: Validate completion criteria before proceeding
5. **Performance Monitoring**: Track performance throughout development

**Ready to begin implementation following strict TDD methodology.**