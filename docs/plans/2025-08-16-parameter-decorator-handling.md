# Implementation Plan: Parameter Decorator Handling (FR-04)

**Created by**: implementation-planner  
**Executed by**: implementation-executor  
**Date**: 2025-08-16  
**Version**: v1.0  
**Status**: Implementation

---

## 1. Overview

### Feature/Task Description
Implement FR-04 to record Angular parameter decorators (`@Optional`, `@Self`, `@SkipSelf`, `@Host`) as edge flags when the `--include-decorators` CLI option is set. This enhancement provides detailed dependency injection metadata in generated dependency graphs.

**Goal**: Enable detection and reporting of Angular DI parameter decorators in both legacy parameter decorator syntax and modern inject() function patterns.

**Scope**: 
- Extend existing parameter analysis to detect decorators
- Support both `@Optional()` syntax and `inject(Service, { optional: true })` patterns
- Integrate with existing CLI `--include-decorators` flag
- Maintain backward compatibility with existing EdgeFlags system
- Provide graceful error handling for unknown decorators

**Priority**: High

### Context & Background
- **Requirements**: @docs/prd/mvp-requirements.md#fr-04
- **Related Documentation**: @docs/plans/tasks/task-2.3-parameter-decorators.md
- **Dependencies**: 
  - Task 2.1: ts-morph project loading (completed)
  - Task 2.2: basic DI analysis (completed)
  - Existing EdgeFlags interface in src/types/index.ts
  - Existing CLI infrastructure with --include-decorators flag

---

## 2. Technical Approach

### Architecture Decisions
**Design Pattern**: Extend existing AngularParser with decorator analysis methods while maintaining separation of concerns

**Technology Stack**: 
- ts-morph for AST analysis and decorator detection
- Existing EdgeFlags interface (no changes needed)
- TypeScript pattern matching for inject() calls

**Integration Points**:
- Enhance `parseConstructorParameter()` method in AngularParser
- Integrate with existing CLI flag `--include-decorators`
- Populate EdgeFlags in ParsedDependency objects
- Support both legacy and modern Angular patterns

### File Structure
```
src/
├── core/
│   └── parser.ts                 # Enhanced with decorator detection
├── types/
│   └── index.ts                  # EdgeFlags interface (no changes)
└── cli/
    └── index.ts                  # CLI integration (flag already exists)

tests/
├── unit/
│   ├── parser-decorator.test.ts  # New decorator-specific tests
│   └── parser.test.ts            # Enhanced existing tests
├── integration/
│   └── cli-decorator.test.ts     # CLI integration tests
└── fixtures/
    └── decorator-samples/        # Sample Angular code with decorators
```

### Data Flow
1. CLI receives `--include-decorators` flag → CliOptions.includeDecorators
2. AngularParser.parseConstructorParameter() → analyzeParameterDecorators()
3. Decorator detection → EdgeFlags population
4. EdgeFlags → ParsedDependency.flags
5. Graph building uses enhanced EdgeFlags for edge creation

---

## 3. Implementation Tasks

### Phase 1: Core Decorator Detection Foundation
**Priority**: High  
**Estimated Duration**: 2-3 hours (2 TDD cycles)

- [ ] **Task 1.1**: Legacy Parameter Decorator Detection (TDD Cycle 1.1)
  - **TDD Approach**: Write failing tests for `@Optional()`, `@Self()`, `@SkipSelf()`, `@Host()` detection
  - **Implementation**: Create `analyzeParameterDecorators()` method with ts-morph decorator traversal
  - **Acceptance Criteria**: All four Angular decorators correctly detected and mapped to EdgeFlags

- [ ] **Task 1.2**: EdgeFlags Integration Enhancement (TDD Cycle 1.2)
  - **TDD Approach**: Write tests for EdgeFlags population and multi-decorator handling
  - **Implementation**: Integrate decorator flags into existing `parseConstructorParameter()` workflow
  - **Acceptance Criteria**: EdgeFlags correctly populated, multiple decorators on same parameter supported

### Phase 2: Modern inject() Pattern Support
**Priority**: High  
**Estimated Duration**: 2-3 hours (2 TDD cycles)

- [ ] **Task 2.1**: inject() Function Detection (TDD Cycle 2.1)
  - **TDD Approach**: Write tests for `inject(Service, { optional: true })` pattern detection
  - **Implementation**: Create `analyzeInjectCall()` method for CallExpression analysis
  - **Acceptance Criteria**: inject() options correctly parsed and mapped to EdgeFlags

- [ ] **Task 2.2**: CLI Integration and Control Flow (TDD Cycle 2.2)
  - **TDD Approach**: Write tests for `--include-decorators` flag behavior control
  - **Implementation**: Implement conditional decorator processing based on CLI flag
  - **Acceptance Criteria**: Decorators included/excluded based on flag, no performance impact when disabled

### Phase 3: Error Handling and Edge Cases
**Priority**: Medium  
**Estimated Duration**: 2-3 hours (2 TDD cycles)

- [ ] **Task 3.1**: Graceful Error Handling (TDD Cycle 3.1)
  - **TDD Approach**: Write tests for unknown decorators, malformed syntax, edge cases
  - **Implementation**: Add defensive programming and warning system
  - **Acceptance Criteria**: Unknown decorators gracefully ignored, clear warnings for invalid syntax

- [ ] **Task 3.2**: Verbose Mode Integration (TDD Cycle 3.2)
  - **TDD Approach**: Write tests for verbose decorator analysis output
  - **Implementation**: Add decorator statistics and detailed logging to verbose mode
  - **Acceptance Criteria**: Comprehensive decorator analysis information in verbose output

---

## 4. Test-Driven Development Plan

### Test Strategy
**Approach**: Follow mandatory TDD workflow from @docs/rules/tdd-development-workflow.md

**Test Categories**:
- **Unit Tests**: Decorator detection logic, EdgeFlags population, inject() parsing
- **Integration Tests**: CLI flag integration, end-to-end decorator workflow
- **Edge Case Tests**: Error handling, malformed decorators, unknown patterns

### Test Implementation Order

#### TDD Cycle 1.1: Legacy Parameter Decorator Detection
1. **Red Phase**: Write failing tests for basic decorator detection
   ```typescript
   describe('Parameter Decorator Detection', () => {
     test('detects @Optional decorator')
     test('detects @Self decorator') 
     test('detects @SkipSelf decorator')
     test('detects @Host decorator')
     test('ignores decorators when --include-decorators is false')
   })
   ```

2. **Green Phase**: Implement minimal `analyzeParameterDecorators()` method
3. **Refactor Phase**: Extract common patterns, optimize performance

#### TDD Cycle 1.2: EdgeFlags Enhancement  
1. **Red Phase**: Write failing tests for EdgeFlags integration
   ```typescript
   describe('EdgeFlags Integration', () => {
     test('populates EdgeFlags with decorator information')
     test('handles multiple decorators on same parameter')
     test('preserves existing EdgeFlags structure')
     test('integrates with graph builder')
   })
   ```

2. **Green Phase**: Enhance `parseConstructorParameter()` to populate flags
3. **Refactor Phase**: Clean up flag combination logic

#### TDD Cycle 2.1: inject() Function Detection
1. **Red Phase**: Write failing tests for modern inject() patterns
   ```typescript
   describe('inject() Pattern Detection', () => {
     test('detects inject(Service, { optional: true })')
     test('detects inject(Service, { self: true })')
     test('detects inject(Service, { skipSelf: true })')
     test('detects inject(Service, { host: true })')
     test('handles combined options')
   })
   ```

2. **Green Phase**: Implement `analyzeInjectCall()` method
3. **Refactor Phase**: Optimize CallExpression analysis

#### TDD Cycle 2.2: CLI Integration
1. **Red Phase**: Write failing tests for CLI flag control
   ```typescript
   describe('CLI Integration', () => {
     test('includes decorators when --include-decorators flag set')
     test('excludes decorators when flag unset')
     test('maintains performance when decorators disabled')
     test('CLI help includes decorator option')
   })
   ```

2. **Green Phase**: Implement conditional decorator processing
3. **Refactor Phase**: Optimize flag checking and performance

#### TDD Cycle 3.1: Error Handling
1. **Red Phase**: Write failing tests for error scenarios
   ```typescript
   describe('Error Handling', () => {
     test('handles unknown decorators gracefully')
     test('warns about malformed decorator syntax')
     test('continues processing after decorator errors')
     test('provides actionable error messages')
   })
   ```

2. **Green Phase**: Add defensive error handling
3. **Refactor Phase**: Improve error categorization and messages

#### TDD Cycle 3.2: Verbose Mode Integration
1. **Red Phase**: Write failing tests for verbose output
   ```typescript
   describe('Verbose Mode', () => {
     test('includes decorator analysis in verbose output')
     test('reports decorator resolution statistics')
     test('shows skipped decorators with reasons')
     test('formats verbose output for readability')
   })
   ```

2. **Green Phase**: Add decorator info to verbose logging
3. **Refactor Phase**: Structure verbose output optimally

### Test Files Structure
```
tests/
├── unit/
│   ├── parser-decorator.test.ts      # New decorator-specific tests
│   └── parser.test.ts                # Enhanced with decorator cases
├── integration/
│   └── cli-decorator.test.ts         # CLI decorator integration
├── fixtures/
│   └── decorator-samples/
│       ├── legacy-decorators.ts      # @Optional, @Self examples
│       ├── modern-inject.ts          # inject() patterns
│       ├── mixed-patterns.ts         # Combined legacy/modern
│       └── edge-cases.ts             # Error scenarios
└── e2e/
    └── decorator-workflow.test.ts    # Full decorator workflow
```

---

## 5. Technical Specifications

### Interfaces & Types
```typescript
// No changes needed - existing EdgeFlags interface sufficient
interface EdgeFlags {
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
  host?: boolean;
}

// Internal types for decorator analysis
interface ParameterAnalysisResult {
  token: string;
  flags: EdgeFlags;
  source: 'decorator' | 'inject' | 'type';
}

interface DecoratorInfo {
  name: string;
  arguments?: any[];
  source: 'parameter' | 'inject';
}
```

### API Design
```typescript
class AngularParser {
  // New method for decorator detection
  private analyzeParameterDecorators(
    parameter: ParameterDeclaration, 
    includeDecorators: boolean
  ): EdgeFlags;

  // Enhanced parameter analysis (existing method)
  private parseConstructorParameter(
    param: ParameterDeclaration
  ): ParsedDependency | null;

  // New method for inject() pattern detection  
  private analyzeInjectCall(
    callExpression: CallExpression
  ): ParameterAnalysisResult | null;

  // Helper methods
  private getDecoratorFlags(decoratorName: string): Partial<EdgeFlags>;
  private parseInjectOptions(optionsObject: ObjectLiteralExpression): EdgeFlags;
  private isAngularDIDecorator(decoratorName: string): boolean;
}
```

### Configuration
- **Environment Variables**: None required
- **Config Files**: Leverages existing CLI configuration
- **Default Values**: `includeDecorators: false` (no performance impact by default)

---

## 6. Error Handling & Edge Cases

### Error Scenarios
- **Unknown Decorators**: Warn and continue processing, don't fail
- **Malformed Decorator Syntax**: Log warning with file location, skip decorator
- **Invalid inject() Options**: Handle gracefully, extract valid options only
- **Mixed Pattern Conflicts**: Prioritize explicit decorators over inject() options

### Edge Cases
- **Multiple Decorators**: `@Optional() @Self() param: Service` - combine flags
- **Complex inject() Calls**: `inject(SERVICE_TOKEN, { optional: true, self: true })`
- **Generic Services**: `inject<MyService>(MyService, { optional: true })`
- **Aliased Decorators**: `import { Optional as Opt } from '@angular/core'`

### Validation Requirements
- **Input Validation**: Validate decorator names against known Angular DI decorators
- **Output Validation**: Ensure EdgeFlags combinations are logically valid
- **Performance Validation**: Ensure <10% performance impact when decorators enabled

---

## 7. Performance Considerations

### Performance Requirements
- **Target Metrics**: <5% parsing time increase when decorators enabled, 0% when disabled
- **Bottlenecks**: Decorator AST traversal, repeated decorator name resolution
- **Optimization Strategy**: Lazy evaluation, caching decorator resolution results

### Memory Management
- **Memory Usage**: Minimal increase due to EdgeFlags boolean flags
- **Large Dataset Handling**: Efficient decorator detection without excessive object creation

### Optimization Techniques
- Only analyze decorators when `--include-decorators` flag is set
- Cache decorator name resolutions per source file
- Use efficient AST traversal patterns from ts-morph
- Reuse EdgeFlags objects where possible

---

## 8. Progress Tracking

### Milestones
- [ ] **Milestone 1**: Foundation Complete - 2025-08-16 EOD
  - [ ] TDD Cycle 1.1: Legacy decorator detection working
  - [ ] TDD Cycle 1.2: EdgeFlags integration complete
  - [ ] Unit tests for basic decorator functionality passing
  
- [ ] **Milestone 2**: Core Implementation Complete - 2025-08-17 EOD
  - [ ] TDD Cycle 2.1: inject() pattern detection working
  - [ ] TDD Cycle 2.2: CLI integration complete
  - [ ] Integration tests passing
  
- [ ] **Milestone 3**: Feature Complete - 2025-08-18 EOD
  - [ ] TDD Cycle 3.1: Error handling robust
  - [ ] TDD Cycle 3.2: Verbose mode integration complete
  - [ ] All acceptance criteria met, performance targets achieved

### Progress Updates
**Last Updated**: 2025-08-17  
**Current Status**: Implementation in progress - TDD Cycle 1.1 starting  
**Blockers**: None - all prerequisites completed  
**Next Steps**: Execute TDD Cycle 1.1 - Legacy Parameter Decorator Detection  
**Phase Status**: ✅ Planning complete → 🚧 Implementation started

---

## 9. Definition of Done

### Completion Criteria
- [ ] All six TDD cycles completed with full test coverage
- [ ] All four Angular DI decorators (`@Optional`, `@Self`, `@SkipSelf`, `@Host`) correctly detected
- [ ] Modern inject() patterns with options properly analyzed
- [ ] CLI `--include-decorators` flag controls decorator inclusion
- [ ] Backward compatibility maintained - existing functionality unchanged
- [ ] Performance impact <10% when decorators enabled, 0% when disabled
- [ ] Graceful error handling for unknown/malformed decorators

### Acceptance Testing
- [ ] **Functional Requirements**: FR-04 completely satisfied
- [ ] **Edge Cases**: Multi-decorator, mixed patterns, error scenarios handled
- [ ] **Integration**: CLI integration working, graph building enhanced
- [ ] **Performance**: Meets performance targets under load testing

### Code Quality Checks
- [ ] `npm run lint` passes with no decorator-related warnings
- [ ] `npm run typecheck` passes with enhanced type safety  
- [ ] `npm run test` all tests pass including new decorator tests
- [ ] Code coverage >90% for decorator detection logic
- [ ] `npm run test:watch` used throughout TDD development

---

## 10. Risk Assessment

### High Risk Items
- **Risk 1**: Performance degradation during decorator analysis
  - **Mitigation**: Lazy evaluation, performance testing, optimization
- **Risk 2**: Breaking existing EdgeFlags backward compatibility
  - **Mitigation**: Comprehensive regression testing, careful interface design

### Dependencies & Blockers
- **External Dependencies**: ts-morph API stability for decorator analysis
- **Internal Dependencies**: Existing AngularParser implementation (completed)

### Contingency Plans
- **Plan A**: Full decorator and inject() support as specified
- **Plan B**: If inject() analysis proves complex, implement decorator-only in Phase 1

---

## 11. Notes & Decisions

### Implementation Notes
- Use existing EdgeFlags interface - no changes required
- Leverage ts-morph's built-in decorator analysis capabilities
- Maintain strict separation between legacy and modern pattern detection
- Focus on performance optimization since decorator analysis adds overhead
- Implement comprehensive error handling to ensure robustness

### Decision Log
- **Decision 1**: Reuse existing EdgeFlags interface instead of creating new types
  - **Rationale**: Maintains backward compatibility, reduces complexity
- **Decision 2**: Support both legacy decorators and modern inject() in same implementation
  - **Rationale**: Provides complete Angular pattern coverage for future-proofing
- **Decision 3**: Use lazy evaluation controlled by CLI flag
  - **Rationale**: Avoids performance impact when decorators not needed

### Questions for Executor
- Should inject() pattern detection handle complex expressions or just simple object literals?
- How verbose should the warning messages be for unknown decorators?
- Should we cache decorator resolution results across multiple parser instances?

---

## 12. Resources & References

### Documentation
- **Requirements**: @docs/prd/mvp-requirements.md#fr-04
- **Task Details**: @docs/plans/tasks/task-2.3-parameter-decorators.md
- **Workflow**: @docs/rules/tdd-development-workflow.md
- **Project Context**: @CLAUDE.md

### External Resources
- [ts-morph Decorator API Documentation](https://ts-morph.com/details/decorators)
- [Angular DI Decorator Documentation](https://angular.io/guide/dependency-injection)
- [Angular inject() Function Documentation](https://angular.io/api/core/inject)

### Code Examples
- Existing AngularParser implementation in src/core/parser.ts
- EdgeFlags interface in src/types/index.ts
- CLI integration pattern in src/cli/index.ts

---

## Development Session Breakdown

### Session 1: TDD Cycle 1.1 - Legacy Decorator Detection (1-2 hours)
**Entry Criteria**: Planning complete, development environment ready
**Focus**: Write failing tests for @Optional, @Self, @SkipSelf, @Host detection
**Deliverable**: `analyzeParameterDecorators()` method with basic functionality
**Exit Criteria**: All legacy decorator tests passing, method integrated with parser

### Session 2: TDD Cycle 1.2 - EdgeFlags Integration (1-2 hours)  
**Entry Criteria**: Session 1 complete, decorator detection working
**Focus**: Integration with existing EdgeFlags system and multi-decorator support
**Deliverable**: Enhanced `parseConstructorParameter()` with decorator flags
**Exit Criteria**: EdgeFlags correctly populated, backward compatibility maintained

### Session 3: TDD Cycle 2.1 - inject() Pattern Detection (1-2 hours)
**Entry Criteria**: Foundation sessions complete, EdgeFlags working
**Focus**: Modern inject() function pattern analysis
**Deliverable**: `analyzeInjectCall()` method and inject() option parsing
**Exit Criteria**: inject() patterns correctly detected and converted to EdgeFlags

### Session 4: TDD Cycle 2.2 - CLI Integration (1-2 hours)
**Entry Criteria**: Core detection working, both legacy and modern patterns
**Focus**: CLI flag integration and conditional processing
**Deliverable**: Complete CLI integration with performance optimization
**Exit Criteria**: --include-decorators flag controls behavior, no perf impact when disabled

### Session 5: TDD Cycle 3.1 - Error Handling (1-2 hours)
**Entry Criteria**: Core functionality complete, integration working
**Focus**: Graceful error handling and edge case management
**Deliverable**: Robust error handling with warnings and recovery
**Exit Criteria**: Unknown decorators handled gracefully, clear error messages

### Session 6: TDD Cycle 3.2 - Verbose Mode (1-2 hours)
**Entry Criteria**: Error handling complete, system robust
**Focus**: Verbose mode integration and comprehensive logging
**Deliverable**: Enhanced verbose output with decorator analysis details
**Exit Criteria**: Complete verbose mode support, all acceptance criteria met

Each session follows strict TDD methodology: `npm run test:watch` → Red → Green → Refactor → Next cycle.