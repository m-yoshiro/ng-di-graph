# Task 1.3: FR-03 - Constructor Token Resolution

**Milestone**: 1 - Core Foundation  
**Priority**: High  
**Dependencies**: Task 1.2 (Class Collection)  
**Functional Requirement**: FR-03 - For each constructor parameter, resolve the token from its type or `@Inject`  
**TDD Focus**: Test parameter type resolution and @Inject handling

## Overview
Implement constructor parameter analysis to extract dependency injection tokens. This completes the core parsing foundation needed for graph building.

## TDD Implementation Steps

### 1. Write Tests First (RED Phase)
Create test cases in `tests/parser.test.ts`:

```typescript
describe('AngularParser - Token Resolution', () => {
  let parser: AngularParser;
  
  beforeEach(() => {
    parser = new AngularParser({
      project: './test-fixtures/tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false
    });
    parser.loadProject();
  });

  it('should resolve type annotation tokens', () => {
    const classes = parser.findDecoratedClasses();
    const testComponent = classes.find(c => c.name === 'TestComponent');
    
    expect(testComponent?.dependencies).toContainEqual({
      token: 'TestService',
      flags: {},
      parameterName: 'testService'
    });
  });

  it('should resolve @Inject tokens', () => {
    const classes = parser.findDecoratedClasses();
    const injectComponent = classes.find(c => c.name === 'InjectComponent');
    
    expect(injectComponent?.dependencies).toContainEqual({
      token: 'API_CONFIG',
      flags: {},
      parameterName: 'config'
    });
  });

  it('should handle primitive types gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const classes = parser.findDecoratedClasses();
    
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping primitive type parameter')
    );
  });

  it('should skip any/unknown types with warning', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    const classes = parser.findDecoratedClasses();
    const componentWithAny = classes.find(c => c.name === 'ComponentWithAny');
    
    expect(componentWithAny?.dependencies).not.toContainEqual(
      expect.objectContaining({ token: 'any' })
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping parameter with any/unknown type')
    );
  });

  it('should handle multiple constructor parameters', () => {
    const classes = parser.findDecoratedClasses();
    const multiDepComponent = classes.find(c => c.name === 'MultiDependencyComponent');
    
    expect(multiDepComponent?.dependencies).toHaveLength(3);
    expect(multiDepComponent?.dependencies.map(d => d.token)).toEqual([
      'ServiceA', 'ServiceB', 'API_TOKEN'
    ]);
  });

  it('should extract parameter names correctly', () => {
    const classes = parser.findDecoratedClasses();
    const testComponent = classes.find(c => c.name === 'TestComponent');
    
    const serviceDep = testComponent?.dependencies.find(d => d.token === 'TestService');
    expect(serviceDep?.parameterName).toBe('testService');
  });
});
```

### 2. Create Additional Test Fixtures
Add to `tests/fixtures/test-classes.ts`:

```typescript
import { Injectable, Component, Inject } from '@angular/core';

export const API_CONFIG = 'API_CONFIG';
export const API_TOKEN = 'API_TOKEN';

@Injectable()
export class TestService {}

@Injectable()
export class ServiceA {}

@Injectable()
export class ServiceB {}

@Component({
  selector: 'app-test',
  template: '<div>Test</div>'
})
export class TestComponent {
  constructor(private testService: TestService) {}
}

@Component({
  selector: 'app-inject',
  template: '<div>Inject</div>'
})
export class InjectComponent {
  constructor(@Inject(API_CONFIG) private config: any) {}
}

@Component({
  selector: 'app-multi',
  template: '<div>Multi</div>'
})
export class MultiDependencyComponent {
  constructor(
    private serviceA: ServiceA,
    private serviceB: ServiceB,
    @Inject(API_TOKEN) private apiToken: string
  ) {}
}

@Component({
  selector: 'app-any',
  template: '<div>Any</div>'
})
export class ComponentWithAny {
  constructor(private anyParam: any, private unknownParam: unknown) {}
}
```

### 3. Implement Token Resolution (GREEN Phase)
Update `src/core/parser.ts`:

```typescript
import { 
  Project, ClassDeclaration, Decorator, ConstructorDeclaration,
  ParameterDeclaration, TypeNode 
} from 'ts-morph';
import { ParsedClass, ParsedDependency, EdgeFlags } from '../types';

export class AngularParser {
  // ... existing code ...

  findDecoratedClasses(): ParsedClass[] {
    const project = this.getProject();
    const sourceFiles = project.getSourceFiles();
    const decoratedClasses: ParsedClass[] = [];

    for (const sourceFile of sourceFiles) {
      const classes = sourceFile.getClasses();
      
      for (const classDecl of classes) {
        const parsedClass = this.parseClassDeclaration(classDecl);
        if (parsedClass) {
          decoratedClasses.push(parsedClass);
        }
      }
    }

    return decoratedClasses;
  }

  private parseClassDeclaration(classDecl: ClassDeclaration): ParsedClass | null {
    const decorators = classDecl.getDecorators();
    
    if (decorators.length === 0) {
      return null;
    }

    const className = classDecl.getName();
    if (!className) {
      console.warn('Skipping anonymous class in file:', classDecl.getSourceFile().getFilePath());
      return null;
    }

    const nodeKind = this.determineNodeKind(decorators);
    if (nodeKind === 'unknown') {
      return null;
    }

    // Extract constructor dependencies
    const dependencies = this.extractConstructorDependencies(classDecl);

    return {
      name: className,
      kind: nodeKind,
      dependencies,
      filePath: classDecl.getSourceFile().getFilePath()
    };
  }

  private extractConstructorDependencies(classDecl: ClassDeclaration): ParsedDependency[] {
    const constructors = classDecl.getConstructors();
    if (constructors.length === 0) {
      return [];
    }

    // Take first constructor (Angular classes should have only one)
    const constructor = constructors[0];
    const parameters = constructor.getParameters();
    const dependencies: ParsedDependency[] = [];

    for (const param of parameters) {
      const dependency = this.parseConstructorParameter(param);
      if (dependency) {
        dependencies.push(dependency);
      }
    }

    return dependencies;
  }

  private parseConstructorParameter(param: ParameterDeclaration): ParsedDependency | null {
    const parameterName = param.getName();
    
    // Check for @Inject decorator first
    const injectDecorator = param.getDecorator('Inject');
    if (injectDecorator) {
      const token = this.extractInjectToken(injectDecorator);
      if (token) {
        return {
          token,
          flags: {}, // Will be populated in Task 2.3
          parameterName
        };
      }
    }

    // Fall back to type annotation
    const typeNode = param.getTypeNode();
    if (typeNode) {
      const token = this.extractTypeToken(typeNode);
      if (token) {
        return {
          token,
          flags: {},
          parameterName
        };
      }
    }

    // Handle inferred types
    const type = param.getType();
    const typeText = type.getText(param);
    
    if (this.shouldSkipType(typeText)) {
      console.warn(`Skipping parameter '${parameterName}' with any/unknown type in ${param.getSourceFile().getFilePath()}`);
      return null;
    }

    if (this.isPrimitiveType(typeText)) {
      console.warn(`Skipping primitive type parameter '${parameterName}': ${typeText}`);
      return null;
    }

    return {
      token: typeText,
      flags: {},
      parameterName
    };
  }

  private extractInjectToken(decorator: Decorator): string | null {
    const callExpr = decorator.getCallExpression();
    if (!callExpr) return null;

    const args = callExpr.getArguments();
    if (args.length === 0) return null;

    const firstArg = args[0];
    return firstArg.getText().replace(/['"]/g, ''); // Remove quotes if string literal
  }

  private extractTypeToken(typeNode: TypeNode): string | null {
    const typeText = typeNode.getText();
    
    if (this.shouldSkipType(typeText)) {
      return null;
    }

    if (this.isPrimitiveType(typeText)) {
      return null;
    }

    return typeText;
  }

  private shouldSkipType(typeText: string): boolean {
    const skipTypes = ['any', 'unknown', 'object', 'Object'];
    return skipTypes.includes(typeText);
  }

  private isPrimitiveType(typeText: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'symbol', 'bigint', 'undefined', 'null'];
    return primitives.includes(typeText);
  }

  // ... existing code ...
}
```

### 4. Refactor (REFACTOR Phase)
- Extract token validation logic
- Add support for generic types
- Improve error messages with file/line information
- Add caching for type resolution

## Implementation Details

### Files to Modify
- `src/core/parser.ts` - Main implementation
- `tests/parser.test.ts` - Test cases  
- `tests/fixtures/test-classes.ts` - Additional test cases
- `src/types/index.ts` - May need EdgeFlags adjustments

### Token Resolution Priority
1. `@Inject(TOKEN)` decorator - highest priority
2. Type annotation - medium priority  
3. Inferred type - lowest priority

### Types to Skip (FR-09)
- `any` and `unknown` types (with warning)
- Primitive types (`string`, `number`, `boolean`, etc.)
- Generic `object` or `Object` types

### Error Handling
- Missing type information: warn and skip
- Malformed @Inject decorators: warn and fall back to type
- Complex generic types: extract base type where possible

## Acceptance Criteria
- [ ] Type annotations resolved correctly to dependency tokens
- [ ] @Inject tokens extracted properly from decorator arguments
- [ ] any/unknown types skipped with appropriate warnings  
- [ ] Primitive types skipped with warnings
- [ ] Multiple constructor parameters handled correctly
- [ ] Parameter names extracted and stored
- [ ] Complex types (generics, unions) handled gracefully
- [ ] Test coverage >90% for token resolution logic
- [ ] Performance: Processes 50+ parameters in <500ms

## Success Metrics
- **Test Coverage**: >90% for constructor parameter parsing
- **Accuracy**: 100% correct token extraction for standard cases
- **Warning Coverage**: All skipped types properly logged
- **Performance**: <500ms for 50 constructor parameters

## Integration Points
- Integrates with Task 1.2 class collection
- Provides foundation for Task 2.1 graph building
- Supports Task 2.3 decorator flag handling

## Next Task
Upon completion, proceed to **Task 2.1: Graph Building** to construct the dependency graph from parsed classes and dependencies.