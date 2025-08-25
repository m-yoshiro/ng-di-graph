import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { Project } from 'ts-morph';
import { AngularParser } from '../src/core/parser';
import type { CliOptions } from '../src/types';

describe('Parameter Decorator Detection - TDD Cycle 1.1', () => {
  let parser: AngularParser;
  let project: Project;

  beforeEach(() => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: true, // Enable decorator detection
      verbose: false,
    };
    parser = new AngularParser(options);
    project = new Project({ useInMemoryFileSystem: true });
  });

  describe('analyzeParameterDecorators method', () => {
    it('should detect @Optional decorator', () => {
      // RED PHASE: This test should fail because analyzeParameterDecorators doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@Optional() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      // This method should be implemented to detect @Optional
      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      expect(flags).toEqual({
        optional: true,
      });
    });

    it('should detect @Self decorator', () => {
      // RED PHASE: This test should fail because analyzeParameterDecorators doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Self } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@Self() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      expect(flags).toEqual({
        self: true,
      });
    });

    it('should detect @SkipSelf decorator', () => {
      // RED PHASE: This test should fail because analyzeParameterDecorators doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, SkipSelf } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@SkipSelf() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      expect(flags).toEqual({
        skipSelf: true,
      });
    });

    it('should detect @Host decorator', () => {
      // RED PHASE: This test should fail because analyzeParameterDecorators doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Host } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@Host() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      expect(flags).toEqual({
        host: true,
      });
    });

    it('should return empty flags when includeDecorators is false', () => {
      // RED PHASE: Test ignores decorators when flag is disabled
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@Optional() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      // When includeDecorators is false, should return empty flags
      const flags = (parser as any).analyzeParameterDecorators(parameter, false);

      expect(flags).toEqual({});
    });

    it('should handle multiple decorators on same parameter', () => {
      // RED PHASE: Test for combining multiple decorators
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@Optional() @Self() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      expect(flags).toEqual({
        optional: true,
        self: true,
      });
    });

    it('should handle unknown decorators gracefully', () => {
      // RED PHASE: Test for graceful handling of unknown decorators
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable } from '@angular/core';

        function CustomDecorator() {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        @Injectable()
        export class TestService {
          constructor(@CustomDecorator() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      // Should return empty flags for unknown decorators
      expect(flags).toEqual({});
    });

    it('should return empty flags when no decorators present', () => {
      // RED PHASE: Test for parameters without decorators
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      expect(flags).toEqual({});
    });

    it('should ignore @Inject decorator (handled separately)', () => {
      // RED PHASE: Test that @Inject is not processed as flag decorator
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Inject } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@Inject('TOKEN') private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      // @Inject should not appear in flags (handled separately for token extraction)
      expect(flags).toEqual({});
    });
  });

  describe('ts-morph decorator traversal', () => {
    it('should correctly identify Angular decorators from imports', () => {
      // RED PHASE: Test decorator name resolution with imports
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional as Opt } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@Opt() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      // Should resolve alias and detect as @Optional
      expect(flags).toEqual({
        optional: true,
      });
    });

    it('should handle complex decorator syntax', () => {
      // RED PHASE: Test complex decorator expressions
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Host } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(
            @Optional() @Host() private dep1: string,
            private dep2: number
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];

      // First parameter with multiple decorators
      const param1 = constructor.getParameters()[0];
      const flags1 = (parser as any).analyzeParameterDecorators(param1, true);
      expect(flags1).toEqual({
        optional: true,
        host: true,
      });

      // Second parameter without decorators
      const param2 = constructor.getParameters()[1];
      const flags2 = (parser as any).analyzeParameterDecorators(param2, true);
      expect(flags2).toEqual({});
    });
  });
});

/**
 * TDD Cycle 1.2 - EdgeFlags Integration Enhancement Tests
 * Focus: Integration of decorator analysis with existing EdgeFlags system
 */
describe('EdgeFlags Integration Enhancement - TDD Cycle 1.2', () => {
  let parser: AngularParser;
  let project: Project;

  beforeEach(() => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: true, // Enable decorator detection
      verbose: false,
    };
    parser = new AngularParser(options);
    project = new Project({ useInMemoryFileSystem: true });
  });

  describe('parseConstructorParameter EdgeFlags integration', () => {
    it('should populate EdgeFlags with decorator information in ParsedDependency', () => {
      // RED PHASE: Test that parseConstructorParameter includes decorator flags in result
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, MyService } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(@Optional() private dep: MyService) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1]; // Second class
      const constructor = testServiceClass.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      // This should integrate with EdgeFlags system
      const result = (parser as any).parseConstructorParameter(parameter);

      expect(result).not.toBeNull();
      expect(result.flags).toEqual({
        optional: true,
      });
      expect(result.token).toBe('MyService');
      expect(result.parameterName).toBe('dep');
    });

    it('should handle multiple decorators on same parameter in integration workflow', () => {
      // RED PHASE: Test multiple decorators flowing through parseConstructorParameter
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self, MyService } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(@Optional() @Self() private dep: MyService) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];
      const constructor = testServiceClass.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const result = (parser as any).parseConstructorParameter(parameter);

      expect(result).not.toBeNull();
      expect(result.flags).toEqual({
        optional: true,
        self: true,
      });
      expect(result.token).toBe('MyService');
    });

    it('should preserve existing EdgeFlags structure without new properties', () => {
      // RED PHASE: Ensure EdgeFlags interface hasn't changed
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Host, MyService } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(@Host() private dep: MyService) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];
      const constructor = testServiceClass.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const result = (parser as any).parseConstructorParameter(parameter);

      expect(result).not.toBeNull();

      // Should only have expected EdgeFlags properties
      const expectedKeys = Object.keys({ host: true });
      const actualKeys = Object.keys(result.flags);

      // Should have exactly the expected keys
      expect(actualKeys.sort()).toEqual(expectedKeys.sort());
      expect(result.flags).toEqual({
        host: true,
      });
    });

    it('should integrate with graph builder workflow via extractConstructorDependencies', () => {
      // RED PHASE: Test that full dependency extraction includes decorator flags
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, SkipSelf, MyService } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(@SkipSelf() private dep: MyService) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];

      // Test full dependency extraction workflow
      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].token).toBe('MyService');
      expect(dependencies[0].flags).toEqual({
        skipSelf: true,
      });
    });

    it('should handle mixed parameters (some with decorators, some without)', () => {
      // RED PHASE: Test mixed parameter scenarios in integration workflow
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, MyService, AnotherService } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class AnotherService {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() private dep1: MyService,
            private dep2: AnotherService
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[2]; // Third class
      const constructor = testServiceClass.getConstructors()[0];
      const parameters = constructor.getParameters();

      // Test first parameter (with decorator)
      const result1 = (parser as any).parseConstructorParameter(parameters[0]);
      expect(result1).not.toBeNull();
      expect(result1.flags).toEqual({ optional: true });
      expect(result1.token).toBe('MyService');

      // Test second parameter (without decorators)
      const result2 = (parser as any).parseConstructorParameter(parameters[1]);
      expect(result2).not.toBeNull();
      expect(result2.flags).toEqual({}); // Empty flags
      expect(result2.token).toBe('AnotherService');
    });

    it('should respect includeDecorators flag in integration workflow', () => {
      // RED PHASE: Test CLI flag control in full workflow
      const optionsWithoutDecorators: CliOptions = {
        project: './tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false, // Disable decorator detection
        verbose: false,
      };
      const parserNoDecorators = new AngularParser(optionsWithoutDecorators);

      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, MyService } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(@Optional() private dep: MyService) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];
      const constructor = testServiceClass.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const result = (parserNoDecorators as any).parseConstructorParameter(parameter);

      expect(result).not.toBeNull();
      expect(result.flags).toEqual({}); // Should be empty when flag disabled
      expect(result.token).toBe('MyService');
    });
  });

  describe('backward compatibility with existing EdgeFlags usage', () => {
    it('should maintain compatibility with existing EdgeFlags consumers', () => {
      // RED PHASE: Ensure existing code consuming EdgeFlags still works
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self, MyService } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(@Optional() @Self() private dep: MyService) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(1);
      const dependency = dependencies[0];

      // Test that existing EdgeFlags pattern works
      if (dependency.flags.optional) {
        expect(dependency.flags.optional).toBe(true);
      }
      if (dependency.flags.self) {
        expect(dependency.flags.self).toBe(true);
      }

      // Test boolean nature of flags
      expect(typeof dependency.flags.optional).toBe('boolean');
      expect(typeof dependency.flags.self).toBe('boolean');
    });

    it('should produce EdgeFlags compatible with graph builder expectations', () => {
      // RED PHASE: Test EdgeFlags structure matches what graph builder expects
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Host, MyService } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(@Host() private dep: MyService) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(1);
      const dependency = dependencies[0];

      // EdgeFlags should have only known properties and correct types
      const flags = dependency.flags;

      // Should only contain boolean properties or be undefined
      for (const [key, value] of Object.entries(flags)) {
        expect(['optional', 'self', 'skipSelf', 'host']).toContain(key);
        if (value !== undefined) {
          expect(typeof value).toBe('boolean');
        }
      }

      expect(flags.host).toBe(true);
    });
  });
});

/**
 * TDD Cycle 2.1 - inject() Function Detection Tests
 * Focus: Modern Angular inject() function pattern detection and EdgeFlags mapping
 */
describe('inject() Function Detection - TDD Cycle 2.1', () => {
  let parser: AngularParser;
  let project: Project;

  beforeEach(() => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: true, // Enable decorator detection
      verbose: false,
    };
    parser = new AngularParser(options);
    project = new Project({ useInMemoryFileSystem: true });
  });

  describe('analyzeInjectCall method', () => {
    it('should detect inject(Service, { optional: true })', () => {
      // RED PHASE: This test should fail because analyzeInjectCall doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService, { optional: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1]; // TestService
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer(); // The inject() call

      // This method should be implemented to detect inject() calls
      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.flags).toEqual({
        optional: true,
      });
      expect(result.source).toBe('inject');
    });

    it('should detect inject(Service, { self: true })', () => {
      // RED PHASE: This test should fail because analyzeInjectCall doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService, { self: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.flags).toEqual({
        self: true,
      });
      expect(result.source).toBe('inject');
    });

    it('should detect inject(Service, { skipSelf: true })', () => {
      // RED PHASE: This test should fail because analyzeInjectCall doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService, { skipSelf: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.flags).toEqual({
        skipSelf: true,
      });
      expect(result.source).toBe('inject');
    });

    it('should detect inject(Service, { host: true })', () => {
      // RED PHASE: This test should fail because analyzeInjectCall doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService, { host: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.flags).toEqual({
        host: true,
      });
      expect(result.source).toBe('inject');
    });

    it('should handle combined options in inject()', () => {
      // RED PHASE: Test for combining multiple options in inject() call
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService, { optional: true, host: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.flags).toEqual({
        optional: true,
        host: true,
      });
      expect(result.source).toBe('inject');
    });

    it('should handle inject() without options', () => {
      // RED PHASE: Test inject() call without second parameter
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService)) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.flags).toEqual({}); // Empty flags when no options
      expect(result.source).toBe('inject');
    });

    it('should handle inject() with string token', () => {
      // RED PHASE: Test inject() with string token
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(private service = inject('MY_TOKEN', { optional: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MY_TOKEN');
      expect(result.flags).toEqual({
        optional: true,
      });
      expect(result.source).toBe('inject');
    });

    it('should return null for non-inject() call expressions', () => {
      // RED PHASE: Test that non-inject calls return null
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable } from '@angular/core';

        function customInjector() { return null; }

        @Injectable()
        export class TestService {
          constructor(private service = customInjector()) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).toBeNull();
    });

    it('should return null for non-call expressions', () => {
      // RED PHASE: Test that non-call expressions return null
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(private value = 42) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).toBeNull();
    });

    it('should handle malformed inject() options gracefully', () => {
      // RED PHASE: Test graceful handling of malformed options
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService, { unknownOption: true, optional: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];
      const initializer = parameter.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      // Should extract valid options and ignore unknown ones
      expect(result.flags).toEqual({
        optional: true,
      });
      expect(result.source).toBe('inject');
    });
  });

  describe('inject() pattern integration with parseConstructorParameter', () => {
    it('should integrate inject() detection in parseConstructorParameter workflow', () => {
      // RED PHASE: Test inject() integration with existing parameter parsing
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService, { optional: true, self: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const result = (parser as any).parseConstructorParameter(parameter);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.parameterName).toBe('service');
      expect(result.flags).toEqual({
        optional: true,
        self: true,
      });
    });

    it('should prioritize legacy decorators over inject() options when both present', () => {
      // RED PHASE: Test precedence when both legacy and modern patterns exist
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject, Optional, Host } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(@Optional() @Host() private service = inject(MyService, { self: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const result = (parser as any).parseConstructorParameter(parameter);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      // Legacy decorators should take precedence
      expect(result.flags).toEqual({
        optional: true,
        host: true,
        // self: true from inject() should be ignored/overridden
      });
    });

    it('should handle inject() when includeDecorators is false', () => {
      // RED PHASE: Test that inject() options are ignored when flag disabled
      const optionsWithoutDecorators: CliOptions = {
        project: './tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false, // Disable decorator detection
        verbose: false,
      };
      const parserNoDecorators = new AngularParser(optionsWithoutDecorators);

      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(private service = inject(MyService, { optional: true })) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const result = (parserNoDecorators as any).parseConstructorParameter(parameter);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.flags).toEqual({}); // Should be empty when flag disabled
    });

    it('should handle field-level inject() patterns', () => {
      // RED PHASE: Test inject() used in field initialization (modern pattern)
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          private service = inject(MyService, { optional: true, host: true });

          constructor() {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];

      // This test is more about ensuring we can detect inject patterns in fields
      // For now, we'll focus on constructor parameters, but this shows the pattern exists
      const property = classDeclaration.getProperties()[0];
      const initializer = property.getInitializer();

      const result = (parser as any).analyzeInjectCall(initializer);

      expect(result).not.toBeNull();
      expect(result.token).toBe('MyService');
      expect(result.flags).toEqual({
        optional: true,
        host: true,
      });
    });
  });
});

/**
 * TDD Cycle 3.1 - Graceful Error Handling Tests
 * Focus: Error handling for edge cases, unknown decorators, and malformed syntax
 */
describe('Graceful Error Handling - TDD Cycle 3.1', () => {
  let parser: AngularParser;
  let project: Project;

  beforeEach(() => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: true, // Enable decorator detection
      verbose: false,
    };
    parser = new AngularParser(options);
    project = new Project({ useInMemoryFileSystem: true });
  });

  describe('Unknown decorator handling', () => {
    it('should handle unknown decorators gracefully', () => {
      // RED PHASE: Test graceful handling of decorators not recognized by Angular
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable } from '@angular/core';

        function UnknownDecorator() {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        function AnotherUnknownDecorator(config: any) {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        @Injectable()
        export class TestService {
          constructor(
            @UnknownDecorator() private dep1: string,
            @AnotherUnknownDecorator({ value: 'test' }) private dep2: number
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const param1 = constructor.getParameters()[0];
      const param2 = constructor.getParameters()[1];

      // Should handle unknown decorators gracefully - return empty flags, no crashes
      const flags1 = (parser as any).analyzeParameterDecorators(param1, true);
      const flags2 = (parser as any).analyzeParameterDecorators(param2, true);

      expect(flags1).toEqual({}); // Empty flags for unknown decorators
      expect(flags2).toEqual({}); // Empty flags for unknown decorators
    });

    it('should warn about unknown decorators but continue processing', () => {
      // RED PHASE: Test warning system for unknown decorators
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);

      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional } from '@angular/core';

        function CustomDecorator() {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        @Injectable()
        export class TestService {
          constructor(
            @CustomDecorator() @Optional() private dep: string
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      // Should detect known decorator and ignore unknown one
      expect(flags).toEqual({
        optional: true,
      });

      // Should have warned about unknown decorator
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain('Unknown or unsupported decorator');
      expect(warnings[0]).toContain('CustomDecorator');

      console.warn = originalWarn; // Restore original warn
    });

    it('should handle mixed known and unknown decorators', () => {
      // RED PHASE: Test combination of known Angular decorators with unknown ones
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self } from '@angular/core';

        function Debug() {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        function Logger(config: any) {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        @Injectable()
        export class TestService {
          constructor(
            @Debug() @Optional() @Logger({ level: 'info' }) @Self() private dep: string
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      const flags = (parser as any).analyzeParameterDecorators(parameter, true);

      // Should extract only known Angular decorators
      expect(flags).toEqual({
        optional: true,
        self: true,
      });
    });
  });

  describe('Malformed decorator syntax handling', () => {
    it('should handle decorators with invalid import names', () => {
      // RED PHASE: Test handling of decorators that can't be resolved
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@NonExistentDecorator() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      // Should not crash on unresolvable decorator names
      const flags = (parser as any).analyzeParameterDecorators(parameter, true);
      expect(flags).toEqual({}); // Empty flags for unresolvable decorators
    });

    it('should handle complex decorator expressions safely', () => {
      // RED PHASE: Test complex decorator syntax that might cause parsing issues
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional } from '@angular/core';

        const config = { optional: true };

        function ComplexDecorator(config: any) {
          return Optional(); // Returns another decorator
        }

        @Injectable()
        export class TestService {
          constructor(
            @ComplexDecorator(config) private dep: string
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      // Should handle complex decorator expressions without crashing
      const flags = (parser as any).analyzeParameterDecorators(parameter, true);
      expect(flags).toEqual({}); // Unable to resolve complex expressions
    });

    it('should handle decorator chains with circular references safely', () => {
      // RED PHASE: Test decorator chains that might cause infinite loops
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(@Optional() @Optional() @Optional() private dep: string) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      // Should handle multiple identical decorators without issues
      const flags = (parser as any).analyzeParameterDecorators(parameter, true);
      expect(flags).toEqual({
        optional: true, // Should be true (not 3x true or broken)
      });
    });
  });

  describe('inject() call error handling', () => {
    it('should handle malformed inject() options gracefully', () => {
      // RED PHASE: Test inject() with invalid option objects
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(
            private service1 = inject(MyService, null),
            private service2 = inject(MyService, undefined),
            private service3 = inject(MyService, 'invalid'),
            private service4 = inject(MyService, { unknownOption: true, optional: true })
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[1];
      const constructor = classDeclaration.getConstructors()[0];
      const parameters = constructor.getParameters();

      // Test null options
      const result1 = (parser as any).parseConstructorParameter(parameters[0]);
      expect(result1).not.toBeNull();
      expect(result1.token).toBe('MyService');
      expect(result1.flags).toEqual({}); // Empty flags for null options

      // Test undefined options
      const result2 = (parser as any).parseConstructorParameter(parameters[1]);
      expect(result2).not.toBeNull();
      expect(result2.token).toBe('MyService');
      expect(result2.flags).toEqual({}); // Empty flags for undefined options

      // Test string options (invalid)
      const result3 = (parser as any).parseConstructorParameter(parameters[2]);
      expect(result3).not.toBeNull();
      expect(result3.token).toBe('MyService');
      expect(result3.flags).toEqual({}); // Empty flags for invalid options

      // Test mixed valid/invalid options
      const result4 = (parser as any).parseConstructorParameter(parameters[3]);
      expect(result4).not.toBeNull();
      expect(result4.token).toBe('MyService');
      expect(result4.flags).toEqual({
        optional: true, // Should extract valid options and ignore invalid ones
      });
    });

    it('should handle inject() with missing token parameter', () => {
      // RED PHASE: Test inject() calls without proper token parameter
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(
            private service1 = inject(),
            private service2 = inject(undefined),
            private service3 = inject(null)
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameters = constructor.getParameters();

      // Test inject() with no parameters
      const result1 = (parser as any).parseConstructorParameter(parameters[0]);
      expect(result1).toBeNull(); // Should return null for invalid inject() calls

      // Test inject(undefined)
      const result2 = (parser as any).parseConstructorParameter(parameters[1]);
      expect(result2).toBeNull(); // Should return null for undefined token

      // Test inject(null)
      const result3 = (parser as any).parseConstructorParameter(parameters[2]);
      expect(result3).toBeNull(); // Should return null for null token
    });

    it('should handle non-Angular inject() function calls', () => {
      // RED PHASE: Test inject() calls from other libraries or custom functions
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable } from '@angular/core';

        function inject(token: any, options?: any) {
          return null; // Custom inject function
        }

        @Injectable()
        export class TestService {
          constructor(
            private service = inject('TOKEN', { custom: true })
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];
      const parameter = constructor.getParameters()[0];

      // Should not process non-Angular inject() calls
      const result = (parser as any).parseConstructorParameter(parameter);
      expect(result).toBeNull(); // Should ignore non-Angular inject calls
    });
  });

  describe('Defensive programming and recovery', () => {
    it('should continue processing after decorator errors', () => {
      // RED PHASE: Test that processing continues even when some decorators fail
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self } from '@angular/core';

        @Injectable()
        export class MyService {}

        function BrokenDecorator() {
          throw new Error('Decorator implementation error');
        }

        @Injectable()
        export class AnotherService {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() private goodDep: MyService,
            @BrokenDecorator() private brokenDep: AnotherService,
            @Self() private anotherGoodDep: MyService
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[2]; // TestService is now the third class

      // Should be able to extract dependencies even with broken decorators in between
      const dependencies = (parser as any).extractConstructorDependencies(classDeclaration);

      // Should have processed all dependencies, with graceful handling for broken ones
      expect(dependencies).toHaveLength(3);

      // First dependency should have optional flag
      expect(dependencies[0].token).toBe('MyService');
      expect(dependencies[0].flags).toEqual({ optional: true });

      // Second dependency should have empty flags (broken decorator ignored)
      expect(dependencies[1].token).toBe('AnotherService');
      expect(dependencies[1].flags).toEqual({});

      // Third dependency should have self flag
      expect(dependencies[2].token).toBe('MyService');
      expect(dependencies[2].flags).toEqual({ self: true });
    });

    it('should provide actionable error messages for common issues', () => {
      // RED PHASE: Test that error messages provide helpful information
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);

      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable } from '@angular/core';

        @Injectable()
        export class TestService {
          constructor(
            @UnknownDecorator() private dep1: string,
            @inject() private dep2: string
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[0];
      const constructor = classDeclaration.getConstructors()[0];

      // Process each parameter to trigger warnings
      const param1 = constructor.getParameters()[0];
      const param2 = constructor.getParameters()[1];

      const flags1 = (parser as any).analyzeParameterDecorators(param1, true);
      const flags2 = (parser as any).analyzeParameterDecorators(param2, true);

      expect(flags1).toEqual({});
      expect(flags2).toEqual({});

      // Should provide actionable error messages
      expect(warnings.length).toBeGreaterThan(0);

      // Check that warnings contain helpful information
      const warningText = warnings.join(' ');
      expect(warningText).toContain('Unknown or unsupported decorator');

      console.warn = originalWarn; // Restore original warn
    });

    it('should maintain system stability during mass decorator errors', () => {
      // RED PHASE: Test stability with many unknown/broken decorators
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional } from '@angular/core';

        @Injectable()
        export class ServiceA {}

        @Injectable()
        export class ServiceB {}

        @Injectable()
        export class ServiceC {}

        @Injectable()
        export class TestService {
          constructor(
            @Unknown1() @Unknown2() @Unknown3() private dep1: ServiceA,
            @Unknown4() @Optional() @Unknown5() private dep2: ServiceB,
            @Unknown6() @Unknown7() @Unknown8() private dep3: ServiceC
          ) {}
        }
        `
      );

      const classDeclaration = sourceFile.getClasses()[3]; // TestService is now the 4th class (0-indexed = 3)

      // Should handle mass decorator errors without system failure
      const dependencies = (parser as any).extractConstructorDependencies(classDeclaration);

      expect(dependencies).toHaveLength(3);

      // Only the parameter with known decorator should have flags
      expect(dependencies[0].flags).toEqual({}); // Unknown decorators
      expect(dependencies[1].flags).toEqual({ optional: true }); // Has known Optional decorator
      expect(dependencies[2].flags).toEqual({}); // Unknown decorators

      // All should have correct token extraction
      expect(dependencies[0].token).toBe('ServiceA');
      expect(dependencies[1].token).toBe('ServiceB');
      expect(dependencies[2].token).toBe('ServiceC');
    });
  });
});

/**
 * TDD Cycle 3.2 - Verbose Mode Integration Tests
 * Focus: Comprehensive decorator analysis information in verbose output
 */
describe('Verbose Mode Integration - TDD Cycle 3.2', () => {
  let parser: AngularParser;
  let project: Project;
  let originalLog: typeof console.log;
  let logOutput: string[];

  beforeEach(() => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: true, // Enable decorator detection
      verbose: true, // Enable verbose mode
    };
    parser = new AngularParser(options);
    project = new Project({ useInMemoryFileSystem: true });

    // Capture console.log output for verbose mode testing
    originalLog = console.log;
    logOutput = [];
    console.log = (message: string) => logOutput.push(message);
  });

  afterEach(() => {
    console.log = originalLog; // Restore original console.log
  });

  describe('Verbose decorator analysis output', () => {
    it('should include decorator analysis in verbose output', () => {
      // RED PHASE: This test should fail because verbose decorator analysis doesn't exist yet
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() private dep1: MyService,
            @Self() private dep2: MyService,
            private dep3: MyService
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1]; // TestService

      // This should trigger verbose decorator analysis output
      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(3);

      // Check that verbose output includes decorator analysis information
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).toContain('=== Decorator Analysis ===');
      expect(verboseOutput).toContain('Optional');
      expect(verboseOutput).toContain('Self');
      expect(verboseOutput).toContain('Parameter: ');
    });

    it('should report decorator resolution statistics', () => {
      // RED PHASE: Test for decorator statistics in verbose output
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self, Host, SkipSelf } from '@angular/core';

        @Injectable()
        export class ServiceA {}

        @Injectable()
        export class ServiceB {}

        @Injectable()
        export class ServiceC {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() private dep1: ServiceA,
            @Self() private dep2: ServiceB,
            @Host() @SkipSelf() private dep3: ServiceC,
            private dep4: ServiceA
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[3]; // TestService

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(4);

      // Check that verbose output includes decorator statistics
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).toContain('Decorator Statistics');
      expect(verboseOutput).toContain('Total decorators detected');
      expect(verboseOutput).toContain('@Optional: 1');
      expect(verboseOutput).toContain('@Self: 1');
      expect(verboseOutput).toContain('@Host: 1');
      expect(verboseOutput).toContain('@SkipSelf: 1');
      expect(verboseOutput).toContain('Parameters with decorators: 3');
      expect(verboseOutput).toContain('Parameters without decorators: 1');
    });

    it('should show skipped decorators with reasons', () => {
      // RED PHASE: Test for reporting unknown/skipped decorators in verbose mode
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional } from '@angular/core';

        function UnknownDecorator() {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        function AnotherUnknownDecorator() {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() @UnknownDecorator() private dep1: MyService,
            @AnotherUnknownDecorator() private dep2: MyService,
            private dep3: MyService
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1]; // TestService

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(3);

      // Check that verbose output reports skipped decorators
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).toContain('Skipped Decorators');
      expect(verboseOutput).toContain('UnknownDecorator');
      expect(verboseOutput).toContain('Reason: Unknown or unsupported decorator');
      expect(verboseOutput).toContain('Total skipped: 1');
    });

    it('should format verbose output for readability', () => {
      // RED PHASE: Test that verbose output is well-formatted and readable
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, inject } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() private dep1: MyService,
            private dep2 = inject(MyService, { self: true })
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(2);

      // Check that verbose output is well-formatted
      const verboseOutput = logOutput.join('\n');

      // Should have clear section headers
      expect(verboseOutput).toContain('=== Decorator Analysis ===');
      expect(verboseOutput).toContain('=== Decorator Statistics ===');

      // Should have clear parameter breakdown
      expect(verboseOutput).toContain('Parameter: dep1');
      expect(verboseOutput).toContain('Parameter: dep2');

      // Should indicate different decorator sources
      expect(verboseOutput).toContain('Legacy decorator: @Optional');
      expect(verboseOutput).toContain('inject() options: {"self":true}');
    });
  });

  describe('inject() pattern analysis in verbose mode', () => {
    it('should include inject() pattern details in verbose output', () => {
      // RED PHASE: Test verbose output for modern inject() patterns
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject } from '@angular/core';

        @Injectable()
        export class ServiceA {}

        @Injectable()
        export class ServiceB {}

        @Injectable()
        export class TestService {
          constructor(
            private dep1 = inject(ServiceA, { optional: true, host: true }),
            private dep2 = inject(ServiceB),
            private dep3 = inject('TOKEN', { self: true })
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[2];

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(3);

      // Check verbose output for inject() pattern analysis
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).toContain('inject() Pattern Analysis');
      expect(verboseOutput).toContain('Service token: ServiceA');
      expect(verboseOutput).toContain('Service token: ServiceB');
      expect(verboseOutput).toContain('Service token: TOKEN');
      expect(verboseOutput).toContain('inject() options detected: {"optional":true,"host":true}');
      expect(verboseOutput).toContain('inject() options detected: {"self":true}');
      expect(verboseOutput).toContain('inject() with no options');
    });

    it('should show inject() vs decorator precedence in verbose mode', () => {
      // RED PHASE: Test verbose output when both inject() and decorators are present
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, inject, Optional, Host } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() @Host() private dep1 = inject(MyService, { self: true, skipSelf: true }),
            private dep2 = inject(MyService, { optional: true })
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(2);

      // Check verbose output shows precedence information
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).toContain('Decorator Precedence Analysis');
      expect(verboseOutput).toContain('Legacy decorators take precedence over inject() options');
      expect(verboseOutput).toContain('Applied: @Optional, @Host');
      expect(verboseOutput).toContain('Overridden inject() options: {"self":true,"skipSelf":true}');
      expect(verboseOutput).toContain('Final flags: {"optional":true,"host":true}');
    });
  });

  describe('Performance metrics in verbose mode', () => {
    it('should include decorator processing performance metrics', () => {
      // RED PHASE: Test performance metrics in verbose output
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self, Host, SkipSelf } from '@angular/core';

        @Injectable()
        export class ServiceA {}

        @Injectable()
        export class ServiceB {}

        @Injectable()
        export class ServiceC {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() @Self() private dep1: ServiceA,
            @Host() @SkipSelf() private dep2: ServiceB,
            private dep3: ServiceC
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[3];

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(3);

      // Check verbose output includes performance metrics
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).toContain('Performance Metrics');
      expect(verboseOutput).toContain('Decorator processing time');
      expect(verboseOutput).toContain('Total parameters analyzed');
      expect(verboseOutput).toContain('Average time per parameter');
      expect(verboseOutput).toContain('ms'); // Should include time units
    });

    it('should provide comprehensive analysis summary', () => {
      // RED PHASE: Test comprehensive analysis summary in verbose mode
      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, inject } from '@angular/core';

        function UnknownDecorator() {
          return function(target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {};
        }

        @Injectable()
        export class ServiceA {}

        @Injectable()
        export class ServiceB {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() private dep1: ServiceA,
            @UnknownDecorator() private dep2: ServiceB,
            private dep3 = inject(ServiceA, { self: true }),
            private dep4: ServiceB
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[2];

      const dependencies = (parser as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(4);

      // Check verbose output provides comprehensive summary
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).toContain('=== Analysis Summary ===');
      expect(verboseOutput).toContain('Total dependencies: 4');
      expect(verboseOutput).toContain('With decorator flags: 2'); // dep1 and dep3
      expect(verboseOutput).toContain('Without decorator flags: 2'); // dep2 and dep4
      expect(verboseOutput).toContain('Legacy decorators used: 1');
      expect(verboseOutput).toContain('inject() patterns used: 1');
      expect(verboseOutput).toContain('Flags distribution:');
      expect(verboseOutput).toContain('optional: 1');
      expect(verboseOutput).toContain('self: 1');
    });
  });

  describe('Verbose mode control', () => {
    it('should not output decorator analysis when verbose is false', () => {
      // RED PHASE: Test that verbose output is suppressed when verbose flag is false
      const optionsNoVerbose: CliOptions = {
        project: './tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: true,
        verbose: false, // Disable verbose mode
      };
      const parserNoVerbose = new AngularParser(optionsNoVerbose);

      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional, Self } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() @Self() private dep: MyService
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];

      // Clear previous log output
      logOutput.length = 0;

      const dependencies = (parserNoVerbose as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].flags).toEqual({
        optional: true,
        self: true,
      });

      // Should not have any verbose decorator analysis output
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).not.toContain('Decorator Analysis');
      expect(verboseOutput).not.toContain('Decorator Statistics');
      expect(verboseOutput).not.toContain('Performance Metrics');
      expect(verboseOutput).toBe(''); // Should be empty when verbose is false
    });

    it('should respect includeDecorators flag in verbose output', () => {
      // RED PHASE: Test that verbose decorator analysis respects includeDecorators flag
      const optionsNoDecorators: CliOptions = {
        project: './tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false, // Disable decorator processing
        verbose: true, // Enable verbose mode
      };
      const parserNoDecorators = new AngularParser(optionsNoDecorators);

      const sourceFile = project.createSourceFile(
        'test.ts',
        `
        import { Injectable, Optional } from '@angular/core';

        @Injectable()
        export class MyService {}

        @Injectable()
        export class TestService {
          constructor(
            @Optional() private dep: MyService
          ) {}
        }
        `
      );

      const classes = sourceFile.getClasses();
      const testServiceClass = classes[1];

      // Clear previous log output
      logOutput.length = 0;

      const dependencies = (parserNoDecorators as any).extractConstructorDependencies(testServiceClass);

      expect(dependencies).toHaveLength(1);
      expect(dependencies[0].flags).toEqual({}); // No flags when decorators disabled

      // Verbose output should indicate that decorator analysis is disabled
      const verboseOutput = logOutput.join('\n');
      expect(verboseOutput).toContain('Decorator analysis disabled');
      expect(verboseOutput).toContain('--include-decorators flag not set');
    });
  });
});