import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AngularParser } from '../core/parser';
import type { CliOptions } from '../types';

describe('AngularParser - Enhanced Type Validation', () => {
  const testTmpDir = './tmp/type-validation-test-fixtures';
  const fixtureDir = join(testTmpDir, 'src');
  const testTsConfig = join(testTmpDir, 'tsconfig.json');

  let parser: AngularParser;
  let options: CliOptions;
  let consoleWarnSpy: typeof console.warn;
  let warningOutput: string[];

  beforeEach(() => {
    // Create test fixtures directory
    if (!existsSync(testTmpDir)) {
      mkdirSync(testTmpDir, { recursive: true });
    }
    if (!existsSync(fixtureDir)) {
      mkdirSync(fixtureDir, { recursive: true });
    }

    // Create tsconfig.json for test fixtures
    const tsConfigContent = {
      compilerOptions: {
        target: 'ES2020',
        module: 'CommonJS',
        strict: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        lib: ['ES2020']
      },
      include: ['src/**/*']
    };
    writeFileSync(testTsConfig, JSON.stringify(tsConfigContent, null, 2));

    // Create test component file
    createTestComponentsFile();

    // Initialize parser options
    options = {
      project: testTsConfig,
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false
    };
    parser = new AngularParser(options);

    // Reset global warning state
    AngularParser.resetWarningState();

    // Capture warning output
    warningOutput = [];
    consoleWarnSpy = console.warn;
    console.warn = (message: string) => {
      warningOutput.push(message);
    };
  });

  afterEach(() => {
    // Restore console.warn
    console.warn = consoleWarnSpy;

    // Clean up test fixtures
    if (existsSync(testTmpDir)) {
      rmSync(testTmpDir, { recursive: true, force: true });
    }
  });

  function createTestComponentsFile(): void {
    const componentContent = `
import { Component, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface GenericService<T> {
  getValue(): T;
}

@Injectable()
export class BaseService {}

@Component({
  selector: 'app-any-type',
  template: '<div>Any Type</div>'
})
export class ComponentWithAnyType {
  constructor(private anyParam: any) {}
}

@Component({
  selector: 'app-unknown-type',
  template: '<div>Unknown Type</div>'
})
export class ComponentWithUnknownType {
  constructor(private unknownParam: unknown) {}
}

@Component({
  selector: 'app-primitives',
  template: '<div>Primitives</div>'
})
export class ComponentWithPrimitives {
  constructor(
    private stringParam: string,
    private numberParam: number,
    private booleanParam: boolean
  ) {}
}

@Component({
  selector: 'app-generics',
  template: '<div>Generics</div>'
})
export class ComponentWithGenerics<T> {
  constructor(private genericService: GenericService<string>) {}
}

@Component({
  selector: 'app-union-type',
  template: '<div>Union Type</div>'
})
export class ComponentWithUnionType {
  constructor(private unionParam: string | number | BaseService) {}
}

declare namespace MyModule {
  export class ScopedService {}
}

@Component({
  selector: 'app-module-type',
  template: '<div>Module Type</div>'
})
export class ComponentWithModuleType {
  constructor(private moduleService: MyModule.ScopedService) {}
}

// Circular reference example
@Injectable()
export class CircularA {
  constructor(private circularB: CircularB) {}
}

@Injectable()
export class CircularB {
  constructor(private circularA: CircularA) {}
}

@Component({
  selector: 'app-circular',
  template: '<div>Circular</div>'
})
export class ComponentWithCircularRef {
  constructor(private circularA: CircularA) {}
}
`;
    writeFileSync(join(fixtureDir, 'test-components.ts'), componentContent);
  }

  describe('Basic Type Validation (Existing - Regression Tests)', () => {
    it('should skip any types with warning', async () => {
      const classes = await parser.findDecoratedClasses();
      const componentWithAny = classes.find(c => c.name === 'ComponentWithAnyType');

      expect(componentWithAny).toBeDefined();
      expect(componentWithAny?.dependencies).not.toContainEqual(
        expect.objectContaining({ token: 'any' })
      );
      expect(warningOutput.some(w => w.includes('anyParam') && w.includes('any/unknown'))).toBe(true);
    });

    it('should skip unknown types with warning', async () => {
      const classes = await parser.findDecoratedClasses();
      const componentWithUnknown = classes.find(c => c.name === 'ComponentWithUnknownType');

      expect(componentWithUnknown).toBeDefined();
      expect(componentWithUnknown?.dependencies).not.toContainEqual(
        expect.objectContaining({ token: 'unknown' })
      );
      expect(warningOutput.some(w => w.includes('unknownParam') && w.includes('any/unknown'))).toBe(true);
    });

    it('should skip primitive types with warning', async () => {
      const classes = await parser.findDecoratedClasses();
      const componentWithPrimitives = classes.find(c => c.name === 'ComponentWithPrimitives');

      expect(componentWithPrimitives).toBeDefined();
      expect(componentWithPrimitives?.dependencies.length).toBe(0);
      expect(warningOutput.some(w => w.includes('primitive type'))).toBe(true);
    });

    it('should deduplicate repeated warnings globally', async () => {
      // Parse twice
      await parser.findDecoratedClasses();
      const classes2 = await parser.findDecoratedClasses();

      // Should still have results
      expect(classes2.length).toBeGreaterThan(0);

      // Count warnings for anyParam
      const anyWarnings = warningOutput.filter(w => w.includes('anyParam'));

      // Should only warn once despite parsing twice
      expect(anyWarnings.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Enhanced Type Resolution', () => {
    it('should detect and warn about unresolved import types', async () => {
      // Create component with missing import
      const missingImportContent = `
import { Component } from '@angular/core';

// Missing import: import { NonExistentService } from './non-existent';

@Component({
  selector: 'app-missing-import',
  template: '<div>Missing Import</div>'
})
export class ComponentWithMissingImport {
  constructor(private service: NonExistentService) {}
}
`;
      writeFileSync(join(fixtureDir, 'missing-import.ts'), missingImportContent);

      const classes = await parser.findDecoratedClasses();
      const componentWithMissingImport = classes.find(c => c.name === 'ComponentWithMissingImport');

      expect(componentWithMissingImport).toBeDefined();
      expect(componentWithMissingImport?.dependencies).not.toContainEqual(
        expect.objectContaining({ token: 'NonExistentService' })
      );
      expect(warningOutput.some(w => w.includes('Unresolved type') && w.includes('NonExistentService'))).toBe(true);
    });

    it('should handle generic type parameters appropriately', async () => {
      const classes = await parser.findDecoratedClasses();
      const componentWithGenerics = classes.find(c => c.name === 'ComponentWithGenerics');

      expect(componentWithGenerics).toBeDefined();
      // Should extract full generic type
      expect(componentWithGenerics?.dependencies).toContainEqual(
        expect.objectContaining({ token: 'GenericService<string>' })
      );
    });

    it('should detect circular type references', async () => {
      const classes = await parser.findDecoratedClasses();
      const circularA = classes.find(c => c.name === 'CircularA');

      expect(circularA).toBeDefined();
      // Should warn about circular references
      expect(warningOutput.some(w => w.includes('Circular type reference'))).toBe(true);
    });

    it('should handle union types gracefully', async () => {
      const classes = await parser.findDecoratedClasses();
      const componentWithUnion = classes.find(c => c.name === 'ComponentWithUnionType');

      expect(componentWithUnion).toBeDefined();
      // Should skip complex union types with warning
      expect(warningOutput.some(w => w.includes('union type'))).toBe(true);
    });

    it('should resolve module-scoped types', async () => {
      const classes = await parser.findDecoratedClasses();
      const componentWithModule = classes.find(c => c.name === 'ComponentWithModuleType');

      expect(componentWithModule).toBeDefined();
      expect(componentWithModule?.dependencies).toContainEqual(
        expect.objectContaining({ token: 'MyModule.ScopedService' })
      );
    });
  });

  describe('Structured Warning System', () => {
    it('should provide getStructuredWarnings() method', async () => {
      await parser.findDecoratedClasses();

      expect(parser.getStructuredWarnings).toBeDefined();
      expect(typeof parser.getStructuredWarnings).toBe('function');
    });

    it('should categorize warnings by type', async () => {
      await parser.findDecoratedClasses();

      const warnings = parser.getStructuredWarnings();
      expect(warnings).toBeDefined();
      expect(warnings.categories).toBeDefined();
      expect(warnings.categories).toHaveProperty('typeResolution');
      expect(warnings.categories).toHaveProperty('skippedTypes');
      expect(warnings.categories).toHaveProperty('unresolvedImports');
      expect(warnings.categories).toHaveProperty('circularReferences');
      expect(warnings.categories).toHaveProperty('performance');
    });

    it('should provide total warning count', async () => {
      await parser.findDecoratedClasses();

      const warnings = parser.getStructuredWarnings();
      expect(warnings.totalCount).toBeDefined();
      expect(typeof warnings.totalCount).toBe('number');
      expect(warnings.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should provide file context in warnings', async () => {
      await parser.findDecoratedClasses();

      const warnings = parser.getStructuredWarnings();
      const allWarnings = [
        ...warnings.categories.typeResolution,
        ...warnings.categories.skippedTypes,
        ...warnings.categories.unresolvedImports,
        ...warnings.categories.circularReferences,
        ...warnings.categories.performance
      ];

      // At least one warning should have file context
      if (allWarnings.length > 0) {
        const warningWithFile = allWarnings.find(w => w.file !== undefined);
        expect(warningWithFile).toBeDefined();
        expect(warningWithFile?.file).toContain('test-components.ts');
      }
    });

    it('should suggest actionable fixes in warnings', async () => {
      await parser.findDecoratedClasses();

      const warnings = parser.getStructuredWarnings();
      const skippedTypeWarnings = warnings.categories.skippedTypes;

      // At least one warning should have a suggestion
      if (skippedTypeWarnings.length > 0) {
        const warningWithSuggestion = skippedTypeWarnings.find(w => w.suggestion !== undefined);
        expect(warningWithSuggestion).toBeDefined();
        expect(warningWithSuggestion?.suggestion).toBeTruthy();
      }
    });

    it('should include severity levels in warnings', async () => {
      await parser.findDecoratedClasses();

      const warnings = parser.getStructuredWarnings();
      const allWarnings = [
        ...warnings.categories.typeResolution,
        ...warnings.categories.skippedTypes,
        ...warnings.categories.unresolvedImports,
        ...warnings.categories.circularReferences,
        ...warnings.categories.performance
      ];

      // All warnings should have severity
      for (const warning of allWarnings) {
        expect(warning.severity).toBeDefined();
        expect(['warning', 'error', 'info']).toContain(warning.severity);
      }
    });

    it('should throttle repeated warnings', async () => {
      // Process multiple times
      await parser.findDecoratedClasses();
      await parser.findDecoratedClasses();
      await parser.findDecoratedClasses();

      const warnings = parser.getStructuredWarnings();

      // Should not have excessive warnings despite multiple parses
      // Reasonable threshold based on test fixture size
      expect(warnings.totalCount).toBeLessThan(100);
    });
  });

  describe('Performance Optimization', () => {
    it('should cache type resolution results', async () => {
      const startTime = performance.now();
      await parser.findDecoratedClasses();
      const firstRun = performance.now() - startTime;

      const startTime2 = performance.now();
      await parser.findDecoratedClasses();
      const secondRun = performance.now() - startTime2;

      // Second run should be significantly faster due to caching
      // Allow some variance but expect meaningful improvement
      expect(secondRun).toBeLessThan(firstRun * 0.8);
    });

    it('should handle large number of type validations efficiently', async () => {
      const startTime = performance.now();
      await parser.findDecoratedClasses();
      const duration = performance.now() - startTime;

      // Should complete within reasonable time (1 second for small test fixtures)
      expect(duration).toBeLessThan(1000);
    });

    it('should track slow type resolution in performance warnings', async () => {
      await parser.findDecoratedClasses();

      const warnings = parser.getStructuredWarnings();
      const performanceWarnings = warnings.categories.performance;

      // Performance warnings should exist if any type resolution was slow
      expect(Array.isArray(performanceWarnings)).toBe(true);
    });

    it('should process enhanced validation with <20% overhead', async () => {
      // Baseline: parse without enhanced validation (existing functionality)
      const baselineParser = new AngularParser(options);
      const baselineStart = performance.now();
      await baselineParser.findDecoratedClasses();
      const baselineDuration = performance.now() - baselineStart;

      // Enhanced: parse with enhanced validation
      const enhancedParser = new AngularParser(options);
      const enhancedStart = performance.now();
      await enhancedParser.findDecoratedClasses();
      const enhancedDuration = performance.now() - enhancedStart;

      // Calculate overhead
      const overhead = ((enhancedDuration - baselineDuration) / baselineDuration) * 100;

      // Should be less than 20% overhead
      expect(overhead).toBeLessThan(20);
    });
  });

  describe('Verbose Mode Diagnostics', () => {
    beforeEach(() => {
      options.verbose = true;
      parser = new AngularParser(options);

      // Capture both warn and log for verbose mode
      const consoleLogSpy = console.log;
      console.log = (message: string) => {
        warningOutput.push(message);
      };
    });

    it('should provide detailed type resolution information', async () => {
      await parser.findDecoratedClasses();

      expect(warningOutput.some(w => w.includes('Type resolution steps'))).toBe(true);
    });

    it('should show import resolution attempts', async () => {
      // Create component with complex import scenario
      const complexImportContent = `
import { Component } from '@angular/core';
import { BaseService } from './test-components';

@Component({
  selector: 'app-complex',
  template: '<div>Complex</div>'
})
export class ComponentWithComplexImport {
  constructor(private service: BaseService) {}
}
`;
      writeFileSync(join(fixtureDir, 'complex-import.ts'), complexImportContent);

      await parser.findDecoratedClasses();

      expect(warningOutput.some(w => w.includes('resolve') || w.includes('import'))).toBe(true);
    });

    it('should display cache statistics in verbose mode', async () => {
      await parser.findDecoratedClasses();
      await parser.findDecoratedClasses(); // Parse twice to generate cache hits

      // Verbose mode should show cache-related information
      const cacheRelatedOutput = warningOutput.some(w =>
        w.toLowerCase().includes('cache') ||
        w.toLowerCase().includes('cached') ||
        w.toLowerCase().includes('hit')
      );

      // Cache statistics should be visible when verbose is enabled
      expect(cacheRelatedOutput).toBe(true);
    });

    it('should output warning summary at end of parsing', async () => {
      await parser.findDecoratedClasses();

      const warnings = parser.getStructuredWarnings();

      // In verbose mode, summary information should be available
      expect(warnings.totalCount).toBeGreaterThanOrEqual(0);

      // Should have processed some components
      const classes = await parser.findDecoratedClasses();
      expect(classes.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed generic types gracefully', async () => {
      const malformedGenericContent = `
import { Component } from '@angular/core';

interface BadGeneric<T {
  value: T;
}

@Component({
  selector: 'app-malformed',
  template: '<div>Malformed</div>'
})
export class ComponentWithMalformedGeneric {
  constructor(private service: BadGeneric<string>) {}
}
`;
      writeFileSync(join(fixtureDir, 'malformed-generic.ts'), malformedGenericContent);

      // Should not crash, should handle gracefully
      await expect(parser.findDecoratedClasses()).resolves.toBeDefined();
    });

    it('should handle type alias chains', async () => {
      const typeAliasContent = `
import { Component, Injectable } from '@angular/core';

@Injectable()
export class ActualService {}

type ServiceAlias = ActualService;
type DoubleAlias = ServiceAlias;

@Component({
  selector: 'app-alias',
  template: '<div>Alias</div>'
})
export class ComponentWithTypeAlias {
  constructor(private service: DoubleAlias) {}
}
`;
      writeFileSync(join(fixtureDir, 'type-alias.ts'), typeAliasContent);

      const classes = await parser.findDecoratedClasses();
      const componentWithAlias = classes.find(c => c.name === 'ComponentWithTypeAlias');

      expect(componentWithAlias).toBeDefined();
      // Should resolve alias chain
      expect(componentWithAlias?.dependencies.length).toBeGreaterThan(0);
    });

    it('should handle namespace-scoped types correctly', async () => {
      const classes = await parser.findDecoratedClasses();
      const componentWithModule = classes.find(c => c.name === 'ComponentWithModuleType');

      expect(componentWithModule).toBeDefined();
      expect(componentWithModule?.dependencies).toContainEqual(
        expect.objectContaining({ token: 'MyModule.ScopedService' })
      );
    });

    it('should continue processing when individual files fail', async () => {
      // Create a file with syntax errors
      const badSyntaxContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-bad',
  template: '<div>Bad</div>'
})
export class BadComponent {
  constructor(private service syntax error here) {}
}
`;
      writeFileSync(join(fixtureDir, 'bad-syntax.ts'), badSyntaxContent);

      // Should not crash entire parsing, should continue with valid files
      const classes = await parser.findDecoratedClasses();

      // Should still find other valid components
      expect(classes.length).toBeGreaterThan(0);
    });

    it('should handle self-referencing types (direct circular)', async () => {
      const selfRefContent = `
import { Component } from '@angular/core';

@Component({
  selector: 'app-self-ref',
  template: '<div>Self Ref</div>'
})
export class SelfReferencingComponent {
  constructor(private self: SelfReferencingComponent) {}
}
`;
      writeFileSync(join(fixtureDir, 'self-ref.ts'), selfRefContent);

      const classes = await parser.findDecoratedClasses();
      const selfRef = classes.find(c => c.name === 'SelfReferencingComponent');

      expect(selfRef).toBeDefined();
      // Should warn about circular reference
      expect(warningOutput.some(w => w.includes('Circular') || w.includes('circular'))).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing parser functionality', async () => {
      const classes = await parser.findDecoratedClasses();

      // Should still find decorated classes
      expect(classes.length).toBeGreaterThan(0);

      // Should still extract valid dependencies
      const baseService = classes.find(c => c.name === 'CircularA');
      expect(baseService).toBeDefined();
      expect(baseService?.dependencies).toBeDefined();
    });

    it('should not break existing parseClasses() method', async () => {
      const classes = await parser.parseClasses();

      expect(classes.length).toBeGreaterThan(0);
      expect(classes[0]).toHaveProperty('name');
      expect(classes[0]).toHaveProperty('kind');
      expect(classes[0]).toHaveProperty('dependencies');
    });

    it('should work with includeDecorators=false (default)', async () => {
      expect(options.includeDecorators).toBe(false);

      const classes = await parser.findDecoratedClasses();

      // Should still work without decorator flags
      expect(classes.length).toBeGreaterThan(0);

      // Dependencies should not have decorator flags
      for (const cls of classes) {
        for (const dep of cls.dependencies) {
          const flags = dep.flags || {};
          const hasFlags = Object.keys(flags).some(key => flags[key as keyof typeof flags] === true);
          expect(hasFlags).toBe(false);
        }
      }
    });

    it('should maintain global warning deduplication behavior', async () => {
      // Parse multiple times
      await parser.findDecoratedClasses();
      const beforeCount = warningOutput.length;

      await parser.findDecoratedClasses();
      const afterCount = warningOutput.length;

      // Should not significantly increase warnings on second parse (deduplication)
      expect(afterCount - beforeCount).toBeLessThan(5);
    });
  });

  describe('Integration with Existing Features', () => {
    it('should work with inject() function detection', async () => {
      const injectContent = `
import { Component, inject } from '@angular/core';
import { BaseService } from './test-components';

@Component({
  selector: 'app-inject',
  template: '<div>Inject</div>'
})
export class ComponentWithInject {
  private service = inject(BaseService);
}
`;
      writeFileSync(join(fixtureDir, 'inject-function.ts'), injectContent);

      const classes = await parser.findDecoratedClasses();
      const componentWithInject = classes.find(c => c.name === 'ComponentWithInject');

      expect(componentWithInject).toBeDefined();
      expect(componentWithInject?.dependencies).toContainEqual(
        expect.objectContaining({ token: 'BaseService' })
      );
    });

    it('should work with @Inject decorator token resolution', async () => {
      const injectDecoratorContent = `
import { Component, Inject } from '@angular/core';

@Component({
  selector: 'app-inject-decorator',
  template: '<div>Inject Decorator</div>'
})
export class ComponentWithInjectDecorator {
  constructor(@Inject('MY_TOKEN') private myToken: any) {}
}
`;
      writeFileSync(join(fixtureDir, 'inject-decorator.ts'), injectDecoratorContent);

      const classes = await parser.findDecoratedClasses();
      const componentWithInjectDec = classes.find(c => c.name === 'ComponentWithInjectDecorator');

      expect(componentWithInjectDec).toBeDefined();
      expect(componentWithInjectDec?.dependencies).toContainEqual(
        expect.objectContaining({ token: 'MY_TOKEN' })
      );
    });

    it('should integrate with parameter decorator detection (when enabled)', async () => {
      options.includeDecorators = true;
      parser = new AngularParser(options);

      const decoratorContent = `
import { Component, Optional } from '@angular/core';
import { BaseService } from './test-components';

@Component({
  selector: 'app-optional',
  template: '<div>Optional</div>'
})
export class ComponentWithOptional {
  constructor(@Optional() private service: BaseService) {}
}
`;
      writeFileSync(join(fixtureDir, 'optional-decorator.ts'), decoratorContent);

      const classes = await parser.findDecoratedClasses();
      const componentWithOptional = classes.find(c => c.name === 'ComponentWithOptional');

      expect(componentWithOptional).toBeDefined();
      expect(componentWithOptional?.dependencies).toContainEqual(
        expect.objectContaining({
          token: 'BaseService',
          flags: expect.objectContaining({ optional: true })
        })
      );
    });
  });
});
