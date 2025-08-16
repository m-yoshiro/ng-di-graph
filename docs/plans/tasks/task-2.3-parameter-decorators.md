# Task 2.3: Parameter Decorator Handling (FR-04)

**Created**: 2025-08-16  
**Status**: Pending  
**Assignee**: Implementation Team  
**Estimated Effort**: 6-8 hours  
**Priority**: High

## Overview

### Purpose
Implement FR-04 to record parameter decorators (`@Optional`, `@Self`, `@SkipSelf`, `@Host`) as edge flags when `--include-decorators` CLI option is set. This enhancement will provide detailed dependency injection metadata in the generated dependency graphs.

### Functional Requirement Mapping
- **FR-04**: Record parameter decorators (`Optional`, `Self`, `SkipSelf`, `Host`) as edge flags when `--include-decorators` is set
- **Related**: FR-10 (error handling), FR-12 (verbose mode support)

### Scope
- [ ] Extend parameter decorator detection in Angular parser
- [ ] Support both legacy parameter decorators (`@Optional()`) and modern inject() patterns
- [ ] Enhance EdgeFlags interface to capture all decorator types
- [ ] Integrate with CLI `--include-decorators` flag
- [ ] Implement graceful handling of unknown decorators
- [ ] Maintain backward compatibility with existing edge flag system

### Out of Scope
- Provider array decorator parsing
- Advanced decorator composition patterns
- Runtime decorator validation

## TDD Implementation Steps

### Phase 1: Core Decorator Detection (Red-Green-Refactor)

#### TDD Cycle 1.1: Basic Parameter Decorator Detection
**Red Phase**: Write failing tests
- [ ] Test detection of `@Optional` parameter decorator
- [ ] Test detection of `@Self` parameter decorator  
- [ ] Test detection of `@SkipSelf` parameter decorator
- [ ] Test detection of `@Host` parameter decorator
- [ ] Test that decorators are ignored when `--include-decorators` is false

**Green Phase**: Minimal implementation
- [ ] Add decorator detection logic to `AngularParser.analyzeConstructorParameter()`
- [ ] Implement basic decorator name extraction from ts-morph nodes
- [ ] Return decorator flags in parameter analysis result

**Refactor Phase**: Optimize and clean
- [ ] Extract decorator detection to separate method
- [ ] Add comprehensive error handling
- [ ] Optimize performance for large constructors

#### TDD Cycle 1.2: EdgeFlags Enhancement
**Red Phase**: Write failing tests
- [ ] Test EdgeFlags interface supports all decorator types
- [ ] Test multiple decorators on same parameter
- [ ] Test EdgeFlags serialization to JSON
- [ ] Test EdgeFlags integration with graph builder

**Green Phase**: Minimal implementation
- [ ] Enhance EdgeFlags TypeScript interface
- [ ] Update Edge interface to use enhanced EdgeFlags
- [ ] Modify graph builder to populate decorator flags

**Refactor Phase**: Optimize and clean
- [ ] Add type safety for flag combinations
- [ ] Implement flag validation logic
- [ ] Add defensive programming for invalid combinations

### Phase 2: Modern inject() Pattern Support (Red-Green-Refactor)

#### TDD Cycle 2.1: inject() Function Detection
**Red Phase**: Write failing tests
- [ ] Test `inject(Service, { optional: true })` pattern detection
- [ ] Test `inject(Service, { self: true })` pattern detection
- [ ] Test `inject(Service, { skipSelf: true })` pattern detection  
- [ ] Test `inject(Service, { host: true })` pattern detection
- [ ] Test mixed decorator and inject() patterns

**Green Phase**: Minimal implementation
- [ ] Add inject() call expression analysis
- [ ] Extract options object from inject() calls
- [ ] Map inject() options to EdgeFlags

**Refactor Phase**: Optimize and clean
- [ ] Handle complex inject() option patterns
- [ ] Add support for combined options
- [ ] Implement robust option parsing

#### TDD Cycle 2.2: CLI Integration
**Red Phase**: Write failing tests
- [ ] Test `--include-decorators` flag parsing
- [ ] Test decorator inclusion/exclusion based on flag
- [ ] Test CLI help text includes new option
- [ ] Test default behavior (decorators excluded)

**Green Phase**: Minimal implementation
- [ ] Add `--include-decorators` to CLI argument parser
- [ ] Pass flag to AngularParser configuration
- [ ] Implement conditional decorator processing

**Refactor Phase**: Optimize and clean
- [ ] Add validation for CLI flag combinations
- [ ] Improve help text and documentation
- [ ] Add environment variable support

### Phase 3: Error Handling and Edge Cases (Red-Green-Refactor)

#### TDD Cycle 3.1: Graceful Error Handling
**Red Phase**: Write failing tests
- [ ] Test handling of unknown decorators
- [ ] Test malformed decorator syntax
- [ ] Test decorators on non-constructor parameters
- [ ] Test circular decorator references

**Green Phase**: Minimal implementation
- [ ] Add try-catch blocks around decorator analysis
- [ ] Implement warning system for unknown decorators
- [ ] Add defensive checks for invalid decorator usage

**Refactor Phase**: Optimize and clean
- [ ] Implement comprehensive error categorization
- [ ] Add detailed error messages with suggestions
- [ ] Optimize error handling performance

#### TDD Cycle 3.2: Verbose Mode Integration
**Red Phase**: Write failing tests
- [ ] Test verbose output includes decorator analysis details
- [ ] Test verbose mode shows decorator resolution steps
- [ ] Test verbose mode reports skipped decorators

**Green Phase**: Minimal implementation
- [ ] Add decorator analysis to verbose logging
- [ ] Include decorator statistics in verbose output
- [ ] Report decorator parsing performance

**Refactor Phase**: Optimize and clean
- [ ] Structure verbose output for readability
- [ ] Add configurable verbosity levels
- [ ] Optimize logging performance

## Implementation Details

### File Modifications Required

#### src/types/index.ts
```typescript
// Enhanced EdgeFlags interface
interface EdgeFlags {
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
  host?: boolean;
}

// Add parameter analysis result type
interface ParameterAnalysisResult {
  token: string;
  flags: EdgeFlags;
  source: 'decorator' | 'inject' | 'type';
}
```

#### src/core/parser.ts
```typescript
class AngularParser {
  // New method for decorator detection
  private analyzeParameterDecorators(
    parameter: ParameterDeclaration, 
    includeDecorators: boolean
  ): EdgeFlags

  // Enhanced parameter analysis
  private analyzeConstructorParameter(
    parameter: ParameterDeclaration,
    includeDecorators: boolean
  ): ParameterAnalysisResult

  // New method for inject() pattern detection
  private analyzeInjectCall(
    callExpression: CallExpression
  ): ParameterAnalysisResult | null
}
```

#### src/cli/index.ts
```typescript
// Add CLI option
interface CliOptions {
  includeDecorators?: boolean; // --include-decorators flag
}

// Update argument parser
const program = new Command()
  .option('--include-decorators', 'include parameter decorator flags in output')
```

### Technical Specifications

#### Decorator Detection Strategy
1. **Legacy Decorators**: Parse `@Optional()`, `@Self()`, `@SkipSelf()`, `@Host()` from parameter decorator list
2. **Modern inject()**: Parse options object from `inject(Token, { optional: true })` calls  
3. **Hybrid Support**: Handle mixed usage patterns within same constructor
4. **Fallback**: Gracefully ignore unknown decorators with optional warnings

#### Performance Considerations
- Lazy decorator analysis (only when `--include-decorators` is set)
- Cache decorator resolution results per parameter
- Optimize ts-morph node traversal for decorator detection
- Memory-efficient EdgeFlags storage

#### Error Handling Strategy
- Non-fatal errors for malformed decorators
- Warning system for unknown decorator types
- Detailed error context in verbose mode
- Graceful degradation for parsing failures

## Acceptance Criteria

### Core Functionality
- [ ] **Decorator Detection**: All four Angular DI decorators (`@Optional`, `@Self`, `@SkipSelf`, `@Host`) are correctly detected
- [ ] **Modern Pattern Support**: inject() function calls with options are properly analyzed
- [ ] **CLI Integration**: `--include-decorators` flag controls decorator inclusion in output
- [ ] **EdgeFlags Population**: Decorator information is correctly stored in EdgeFlags interface
- [ ] **Backward Compatibility**: Existing functionality works unchanged when decorators are disabled

### Edge Cases
- [ ] **Multiple Decorators**: Parameters with multiple decorators are handled correctly
- [ ] **Unknown Decorators**: Custom or unknown decorators are gracefully ignored
- [ ] **Malformed Syntax**: Invalid decorator syntax doesn't crash the parser
- [ ] **Mixed Patterns**: Constructors mixing legacy and modern patterns work correctly

### Output Quality
- [ ] **JSON Output**: EdgeFlags are correctly serialized in JSON format
- [ ] **Mermaid Output**: Decorator flags are optionally included in Mermaid diagrams
- [ ] **Verbose Mode**: Decorator analysis details are included in verbose output
- [ ] **Error Messages**: Clear, actionable error messages for decorator-related issues

### Performance
- [ ] **Performance Impact**: Decorator analysis adds <10% to overall parsing time
- [ ] **Memory Usage**: EdgeFlags storage doesn't significantly increase memory footprint
- [ ] **Large Codebases**: Decorator detection scales to projects with 1000+ files

## Success Metrics

### Test Coverage
- [ ] **Unit Test Coverage**: >90% coverage for decorator detection logic
- [ ] **Integration Test Coverage**: >80% coverage for CLI decorator integration
- [ ] **Edge Case Coverage**: 100% coverage for error handling scenarios

### Quality Metrics  
- [ ] **Type Safety**: All decorator analysis uses proper TypeScript typing
- [ ] **Code Quality**: Passes all lint and typecheck validations
- [ ] **Documentation**: All public methods have comprehensive JSDoc comments

### Performance Targets
- [ ] **Parsing Speed**: <5% performance degradation when decorators enabled
- [ ] **Memory Efficiency**: <10% memory increase for decorator storage
- [ ] **Error Recovery**: 100% graceful handling of decorator parsing failures

## Integration Points

### Dependencies
- **Prerequisite**: Task 2.1 (ts-morph project loading) must be complete
- **Prerequisite**: Task 2.2 (basic DI analysis) must be complete
- **Input**: AngularParser.analyzeConstructorParameter() method
- **Input**: CLI argument parsing system

### Outputs
- **Enhanced EdgeFlags**: Extended interface for downstream graph building
- **CLI Flag**: --include-decorators option for user control
- **Parser Enhancement**: Decorator-aware parameter analysis

### Downstream Impact
- **Graph Builder**: Must handle enhanced EdgeFlags in edge creation
- **JSON Formatter**: Must serialize decorator flags correctly  
- **Mermaid Formatter**: May optionally include decorator annotations
- **Future Tasks**: Provides foundation for advanced DI analysis

## Testing Strategy

### Unit Tests (src/core/parser.test.ts)
```typescript
describe('Parameter Decorator Detection', () => {
  test('detects @Optional decorator')
  test('detects @Self decorator') 
  test('detects @SkipSelf decorator')
  test('detects @Host decorator')
  test('detects inject() with optional flag')
  test('handles multiple decorators')
  test('ignores unknown decorators')
  test('respects --include-decorators flag')
})
```

### Integration Tests (src/integration.test.ts)
```typescript
describe('CLI Decorator Integration', () => {
  test('includes decorators when flag set')
  test('excludes decorators when flag unset')
  test('handles mixed decorator patterns')
  test('produces valid JSON with decorators')
})
```

### End-to-End Tests
- [ ] Real Angular project with various decorator patterns
- [ ] Performance test with large codebase
- [ ] CLI integration with sample Angular applications

## Progress Updates

**Last Updated**: 2025-08-16  
**Current Status**: Ready for implementation  
**Blockers**: None  
**Next Steps**: Begin TDD Cycle 1.1 - Basic Parameter Decorator Detection

## Notes

- This task builds directly on the foundation established in Tasks 2.1 and 2.2
- The implementation should maintain strict separation between legacy and modern Angular patterns
- Performance optimization is critical since decorator analysis adds processing overhead
- The `--include-decorators` flag provides user control over the feature's performance impact
- Comprehensive error handling ensures robustness in real-world Angular codebases