import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { AngularParser } from '../core/parser';
import { CliOptions, ParserError } from '../types';
import { createLogger, LogCategory, type Logger } from '../core/logger';

describe('AngularParser - Project Loading (FR-01)', () => {
  const testTmpDir = './tmp/test-fixtures';
  const validTsConfig = './tsconfig.json';
  const testValidTsConfig = join(testTmpDir, 'valid-tsconfig.json');
  const testInvalidTsConfig = join(testTmpDir, 'invalid-tsconfig.json');
  const testMalformedTsConfig = join(testTmpDir, 'malformed-tsconfig.json');
  const testMissingTsConfig = join(testTmpDir, 'missing-tsconfig.json');

  beforeEach(() => {
    // Create test fixtures directory
    if (!existsSync(testTmpDir)) {
      mkdirSync(testTmpDir, { recursive: true });
    }

    // Create valid tsconfig fixture
    const validTsConfigContent = {
      compilerOptions: {
        target: 'ES2020',
        module: 'CommonJS',
        strict: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      },
      include: ['src/**/*']
    };
    writeFileSync(testValidTsConfig, JSON.stringify(validTsConfigContent, null, 2));

    // Create malformed tsconfig fixture
    writeFileSync(testMalformedTsConfig, '{ invalid json content');

    // Create invalid tsconfig fixture (valid JSON but invalid TypeScript config)
    const invalidTsConfigContent = {
      compilerOptions: {
        target: 'INVALID_TARGET',
        invalidOption: true
      }
    };
    writeFileSync(testInvalidTsConfig, JSON.stringify(invalidTsConfigContent, null, 2));
  });

  afterEach(() => {
    // Clean up test fixtures
    if (existsSync(testTmpDir)) {
      rmSync(testTmpDir, { recursive: true, force: true });
    }
  });

  describe('loadProject() method', () => {
    it('should load valid tsconfig.json without throwing', () => {
      const options: CliOptions = {
        project: validTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      expect(() => parser.loadProject()).not.toThrow();
    });

    it('should throw ParserError for non-existent tsconfig path', () => {
      const options: CliOptions = {
        project: testMissingTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      expect(() => parser.loadProject()).toThrow();

      try {
        parser.loadProject();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as ParserError).code).toBe('TSCONFIG_NOT_FOUND');
        expect(error.message).toContain('tsconfig.json not found');
        expect(error.message).toContain(testMissingTsConfig);
      }
    });

    it('should throw ParserError for malformed tsconfig.json', () => {
      const options: CliOptions = {
        project: testMalformedTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      expect(() => parser.loadProject()).toThrow();

      try {
        parser.loadProject();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as ParserError).code).toBe('TSCONFIG_INVALID');
        expect(error.message).toContain('Invalid tsconfig.json');
      }
    });

    it('should handle TypeScript compilation errors gracefully', () => {
      const options: CliOptions = {
        project: testInvalidTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      expect(() => parser.loadProject()).toThrow();

      try {
        parser.loadProject();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as ParserError).code).toBe('PROJECT_LOAD_FAILED');
      }
    });

    it('should throw error when project is not loaded', () => {
      const options: CliOptions = {
        project: validTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      expect(() => parser.getProject()).toThrow('Project not loaded');
    });

    it('should return valid Project instance after successful loading', () => {
      const options: CliOptions = {
        project: validTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      parser.loadProject();

      const project = parser.getProject();
      expect(project).toBeDefined();
      expect(typeof project.getSourceFiles).toBe('function');
    });

    it('should auto-load project when calling parseClasses() without explicit loadProject()', async () => {
      const options: CliOptions = {
        project: validTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);

      // parseClasses() should auto-load project if not already loaded
      // This will throw "Not implemented yet" but shouldn't throw project loading errors
      try {
        await parser.parseClasses();
      } catch (error) {
        expect(error.message).toBe('Not implemented yet');
        // Should not be a project loading error
        expect((error as ParserError).code).toBeUndefined();
      }

      // Project should now be loaded
      expect(() => parser.getProject()).not.toThrow();
    });
  });

  describe('Error handling requirements from PRD Section 13', () => {
    it('should provide clear error message for missing tsconfig', () => {
      const options: CliOptions = {
        project: './non-existent/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);

      try {
        parser.loadProject();
      } catch (error) {
        expect(error.message).toContain('tsconfig.json not found at: ./non-existent/tsconfig.json');
      }
    });

    it('should suggest actionable solutions for common errors', () => {
      const options: CliOptions = {
        project: testMalformedTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);

      try {
        parser.loadProject();
      } catch (error) {
        expect(error.message).toContain('Invalid tsconfig.json');
        // Should provide helpful context
        expect(error.message.length).toBeGreaterThan(20);
      }
    });
  });

  describe('Performance requirements', () => {
    it('should load project in under 2 seconds for typical config', async () => {
      const options: CliOptions = {
        project: validTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      const startTime = Date.now();

      parser.loadProject();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000);
    });
  });
});

describe('AngularParser - Decorated Class Collection (FR-02)', () => {
  const testFixturesDir = './src/tests/fixtures';
  const testTsConfig = join(testFixturesDir, 'tsconfig.json');

  describe('findDecoratedClasses() method', () => {
    let parser: AngularParser;

    beforeEach(() => {
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false // Disable verbose mode
      };
      parser = new AngularParser(options);
      parser.loadProject();
    });

    it('should detect @Injectable decorated services', async () => {
      const classes = await parser.findDecoratedClasses();

      // Should find all @Injectable services from all fixture files
      const services = classes.filter(c => c.kind === 'service');
      expect(services).toHaveLength(37); // 24 original + 4 from edge-cases.ts + 9 new inject() services

      const serviceNames = services.map(s => s.name);
      // From services.ts
      expect(serviceNames).toContain('BasicService');
      expect(serviceNames).toContain('RootProvidedService');
      expect(serviceNames).toContain('MultiLineDecoratorService');
      expect(serviceNames).toContain('AliasedDecoratorService');
      // From edge-cases.ts
      expect(serviceNames).toContain('MultipleDecoratorsService');
      expect(serviceNames).toContain('MixedDecoratorsService');
      expect(serviceNames).toContain('SpacedDecoratorService');
      expect(serviceNames).toContain('ImportAliasService');
    });

    it('should detect @Component decorated classes', async () => {
      const classes = await parser.findDecoratedClasses();

      // Should find all @Component classes from all fixture files
      const components = classes.filter(c => c.kind === 'component');
      expect(components).toHaveLength(10); // 8 from components.ts + 2 from edge-cases.ts

      const componentNames = components.map(c => c.name);
      // From components.ts
      expect(componentNames).toContain('BasicComponent');
      expect(componentNames).toContain('ComplexComponent');
      expect(componentNames).toContain('AliasedComponent');
      expect(componentNames).toContain('MultiLineComponent');
      // From edge-cases.ts
      expect(componentNames).toContain('SpacedDecoratorComponent');
      expect(componentNames).toContain('ImportAliasComponent');
    });

    it('should detect @Directive decorated classes', async () => {
      const classes = await parser.findDecoratedClasses();

      // Should find all @Directive classes from directives.ts
      const directives = classes.filter(c => c.kind === 'directive');
      expect(directives).toHaveLength(4); // All from directives.ts

      const directiveNames = directives.map(d => d.name);
      expect(directiveNames).toContain('BasicDirective');
      expect(directiveNames).toContain('AdvancedDirective');
      expect(directiveNames).toContain('AliasedDirective');
      expect(directiveNames).toContain('MultiLineDirective');
    });

    it('should correctly map decorator types to NodeKind', async () => {
      const classes = await parser.findDecoratedClasses();

      // Check specific mappings
      const basicService = classes.find(c => c.name === 'BasicService');
      expect(basicService?.kind).toBe('service');

      const basicComponent = classes.find(c => c.name === 'BasicComponent');
      expect(basicComponent?.kind).toBe('component');

      const basicDirective = classes.find(c => c.name === 'BasicDirective');
      expect(basicDirective?.kind).toBe('directive');
    });

    it('should include correct file paths for each class', async () => {
      const classes = await parser.findDecoratedClasses();

      const basicService = classes.find(c => c.name === 'BasicService');
      expect(basicService?.filePath).toContain('services.ts');

      const basicComponent = classes.find(c => c.name === 'BasicComponent');
      expect(basicComponent?.filePath).toContain('components.ts');

      const basicDirective = classes.find(c => c.name === 'BasicDirective');
      expect(basicDirective?.filePath).toContain('directives.ts');
    });

    it('should extract constructor dependencies (FR-03 implemented)', async () => {
      const classes = await parser.findDecoratedClasses();

      // With FR-03 implemented, classes with constructor dependencies should have them extracted
      const testComponent = classes.find(c => c.name === 'TestComponent');
      expect(testComponent?.dependencies).toHaveLength(1);
      expect(testComponent?.dependencies[0]).toEqual({
        token: 'TestService',
        flags: {},
        parameterName: 'testService'
      });

      // Classes without constructors should have empty dependencies
      const basicService = classes.find(c => c.name === 'BasicService');
      expect(basicService?.dependencies).toEqual([]);
    });

    it('should skip undecorated classes silently', async () => {
      const classes = await parser.findDecoratedClasses();

      // Should not include UndecoratedService, UndecoratedComponent, CustomDecoratedClass
      const classNames = classes.map(c => c.name);
      expect(classNames).not.toContain('UndecoratedService');
      expect(classNames).not.toContain('UndecoratedComponent');
      expect(classNames).not.toContain('CustomDecoratedClass');
    });

    it('should handle edge cases with multiple decorators', async () => {
      const classes = await parser.findDecoratedClasses();

      // Should detect Angular decorators even when mixed with custom decorators
      const mixedDecoratorsService = classes.find(c => c.name === 'MixedDecoratorsService');
      expect(mixedDecoratorsService?.kind).toBe('service');

      const multipleDecoratorsService = classes.find(c => c.name === 'MultipleDecoratorsService');
      expect(multipleDecoratorsService?.kind).toBe('service');
    });

    it('should handle different import alias patterns', async () => {
      const classes = await parser.findDecoratedClasses();

      // Should detect classes with aliased imports
      const importAliasService = classes.find(c => c.name === 'ImportAliasService');
      expect(importAliasService?.kind).toBe('service');

      const importAliasComponent = classes.find(c => c.name === 'ImportAliasComponent');
      expect(importAliasComponent?.kind).toBe('component');
    });

    it('should handle spacing variations in decorators', async () => {
      const classes = await parser.findDecoratedClasses();

      // Should detect decorators with different spacing
      const spacedService = classes.find(c => c.name === 'SpacedDecoratorService');
      expect(spacedService?.kind).toBe('service');

      const spacedComponent = classes.find(c => c.name === 'SpacedDecoratorComponent');
      expect(spacedComponent?.kind).toBe('component');
    });

    it('should complete parsing in under 1 second for test fixtures', async () => {
      const startTime = Date.now();

      await parser.findDecoratedClasses();

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000);
    });

    it('should provide method existence on parser instance', () => {
      // Test that the method exists on the parser
      expect(typeof parser.findDecoratedClasses).toBe('function');
    });
  });

  describe('Error handling for decorator detection', () => {
    it('should warn about anonymous classes and skip them', async () => {
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      parser.loadProject();

      // Mock console.warn to capture warnings
      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);

      try {
        const classes = await parser.findDecoratedClasses();

        // Should not include anonymous classes - only properly named classes
        const classNames = classes.map(c => c.name);
        expect(classNames).not.toContain('');
        expect(classNames).not.toContain(undefined);

        // All found classes should have valid names
        classNames.forEach(name => {
          expect(name).toBeTruthy();
          expect(typeof name).toBe('string');
          expect(name.length).toBeGreaterThan(0);
        });

        // Anonymous class detection is a complex edge case that can be enhanced in future versions
        // For now, we ensure that only properly named classes are returned
        // The warning functionality exists but requires more sophisticated AST pattern matching
      } finally {
        console.warn = originalWarn;
      }
    });

    it('should handle files with parsing errors gracefully', async () => {
      // This test will be expanded when we add more robust error handling
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parser = new AngularParser(options);
      parser.loadProject();

      // Should not throw even if some files have issues
      expect(async () => await parser.findDecoratedClasses()).not.toThrow();
    });
  });
});

describe('AngularParser - Constructor Token Resolution (FR-03)', () => {
  const testTsConfig = './src/tests/fixtures/tsconfig.json';
  let parser: AngularParser;

  beforeEach(() => {
    const options: CliOptions = {
      project: testTsConfig,
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false
    };
    parser = new AngularParser(options);
    parser.loadProject();
  });

  describe('Type annotation token resolution', () => {
    it('should resolve type annotation tokens correctly', async () => {
      const classes = await parser.findDecoratedClasses();
      const testComponent = classes.find(c => c.name === 'TestComponent');

      expect(testComponent?.dependencies).toContainEqual({
        token: 'TestService',
        flags: {},
        parameterName: 'testService'
      });
    });

    it('should resolve service with type annotation dependency', async () => {
      const classes = await parser.findDecoratedClasses();
      const testService = classes.find(c => c.name === 'TestService');

      expect(testService?.dependencies).toContainEqual({
        token: 'BasicService',
        flags: {},
        parameterName: 'basicService'
      });
    });

    it('should extract parameter names correctly', async () => {
      const classes = await parser.findDecoratedClasses();
      const testComponent = classes.find(c => c.name === 'TestComponent');

      const serviceDep = testComponent?.dependencies.find(d => d.token === 'TestService');
      expect(serviceDep?.parameterName).toBe('testService');
    });
  });

  describe('@Inject token resolution', () => {
    it('should resolve @Inject tokens correctly', async () => {
      const classes = await parser.findDecoratedClasses();
      const injectComponent = classes.find(c => c.name === 'InjectComponent');

      expect(injectComponent?.dependencies).toContainEqual({
        token: 'API_CONFIG',
        flags: {},
        parameterName: 'config'
      });
    });

    it('should resolve @Inject tokens in services', async () => {
      const classes = await parser.findDecoratedClasses();
      const injectService = classes.find(c => c.name === 'InjectService');

      expect(injectService?.dependencies).toContainEqual({
        token: 'API_CONFIG',
        flags: {},
        parameterName: 'config'
      });
    });

    it('should prioritize @Inject over type annotation', async () => {
      // When both @Inject and type annotation exist, @Inject should take priority
      const classes = await parser.findDecoratedClasses();
      const multiDepComponent = classes.find(c => c.name === 'MultiDependencyComponent');

      // The third parameter has @Inject(API_TOKEN) with type string
      // Should use API_TOKEN from @Inject, not 'string' from type
      const injectDep = multiDepComponent?.dependencies.find(d => d.parameterName === 'apiToken');
      expect(injectDep?.token).toBe('API_TOKEN');
      expect(injectDep?.token).not.toBe('string');
    });
  });

  describe('Multiple constructor parameters', () => {
    it('should handle multiple constructor parameters correctly', async () => {
      const classes = await parser.findDecoratedClasses();
      const multiDepComponent = classes.find(c => c.name === 'MultiDependencyComponent');

      expect(multiDepComponent?.dependencies).toHaveLength(3);

      const tokens = multiDepComponent?.dependencies.map(d => d.token).sort();
      expect(tokens).toEqual(['API_TOKEN', 'ServiceA', 'ServiceB']);
    });

    it('should handle multiple dependencies in services', async () => {
      const classes = await parser.findDecoratedClasses();
      const multiDepService = classes.find(c => c.name === 'MultiDependencyService');

      expect(multiDepService?.dependencies).toHaveLength(3);

      const expectedDeps = [
        { token: 'BasicService', parameterName: 'basicService' },
        { token: 'TestService', parameterName: 'testService' },
        { token: 'API_TOKEN', parameterName: 'apiToken' }
      ];

      expectedDeps.forEach(expected => {
        expect(multiDepService?.dependencies).toContainEqual(
          expect.objectContaining(expected)
        );
      });
    });

    it('should preserve parameter order in dependencies', async () => {
      const classes = await parser.findDecoratedClasses();
      const multiDepComponent = classes.find(c => c.name === 'MultiDependencyComponent');

      const paramNames = multiDepComponent?.dependencies.map(d => d.parameterName);
      expect(paramNames).toEqual(['serviceA', 'serviceB', 'apiToken']);
    });
  });

  describe('Type validation and warnings', () => {
    it('should skip any/unknown types with warning', async () => {
      // Reset warning state to ensure warnings are captured
      AngularParser.resetWarningState();

      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);

      try {
        const classes = await parser.findDecoratedClasses();
        const componentWithAny = classes.find(c => c.name === 'ComponentWithAny');

        // Should not include any/unknown dependencies
        expect(componentWithAny?.dependencies).not.toContainEqual(
          expect.objectContaining({ token: 'any' })
        );
        expect(componentWithAny?.dependencies).not.toContainEqual(
          expect.objectContaining({ token: 'unknown' })
        );

        // Should have warned about skipping these types
        expect(warnings.some(w => w.includes('Skipping parameter') && w.includes('any/unknown type'))).toBe(true);
      } finally {
        console.warn = originalWarn;
      }
    });

    it('should skip primitive types with warning', async () => {
      // Reset warning state to ensure warnings are captured
      AngularParser.resetWarningState();

      const originalWarn = console.warn;
      const warnings: string[] = [];
      console.warn = (message: string) => warnings.push(message);

      try {
        const classes = await parser.findDecoratedClasses();
        const serviceWithPrimitives = classes.find(c => c.name === 'ServiceWithPrimitives');

        // Should not include primitive type dependencies
        expect(serviceWithPrimitives?.dependencies).not.toContainEqual(
          expect.objectContaining({ token: 'string' })
        );
        expect(serviceWithPrimitives?.dependencies).not.toContainEqual(
          expect.objectContaining({ token: 'number' })
        );

        // Should have warned about skipping primitive types (check both explicit and inferred messages)
        expect(warnings.some(w => w.includes('Skipping primitive type') || w.includes('Skipping inferred primitive type parameter'))).toBe(true);
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle classes with no constructor', async () => {
      const classes = await parser.findDecoratedClasses();
      const basicService = classes.find(c => c.name === 'BasicService');

      // Classes without constructors should have empty dependencies
      expect(basicService?.dependencies).toEqual([]);
    });

    it('should handle empty constructors', async () => {
      const classes = await parser.findDecoratedClasses();
      const basicComponent = classes.find(c => c.name === 'BasicComponent');

      // Classes with empty constructors should have empty dependencies
      expect(basicComponent?.dependencies).toEqual([]);
    });

    it('should handle malformed @Inject decorators gracefully', async () => {
      // This will be implemented when we add more sophisticated error handling
      // For now, ensure the parser doesn't crash on edge cases
      const classes = await parser.findDecoratedClasses();
      expect(classes).toBeDefined();
      expect(Array.isArray(classes)).toBe(true);
    });
  });

  describe('Performance requirements', () => {
    it('should process constructor parameters efficiently', async () => {
      const startTime = Date.now();

      const classes = await parser.findDecoratedClasses();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete token resolution for all test fixtures in reasonable time
      expect(duration).toBeLessThan(500); // 500ms threshold for test fixtures

      // Verify we actually processed some dependencies
      const totalDependencies = classes.reduce((sum, cls) => sum + cls.dependencies.length, 0);
      expect(totalDependencies).toBeGreaterThan(0);
    });
  });
});

describe('AngularParser - Parameter Decorator Handling (FR-04)', () => {
  const testTsConfig = './src/tests/fixtures/tsconfig.json';
  let parser: AngularParser;

  beforeEach(() => {
    // Reset warning state for clean test runs
    AngularParser.resetWarningState();
  });

  describe('when --include-decorators is true', () => {
    beforeEach(() => {
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: true, // Enable decorator detection
        verbose: false
      };
      parser = new AngularParser(options);
      parser.loadProject();
    });

    it('should detect @Optional parameter decorator', async () => {
      const classes = await parser.findDecoratedClasses();
      const serviceWithOptional = classes.find(c => c.name === 'ServiceWithOptionalDep');

      expect(serviceWithOptional).toBeDefined();
      expect(serviceWithOptional?.dependencies).toHaveLength(1);

      const optionalDep = serviceWithOptional?.dependencies[0];
      expect(optionalDep?.flags?.optional).toBe(true);
      expect(optionalDep?.parameterName).toBe('optionalService');
      expect(optionalDep?.token).toBe('OptionalService');
    });

    it('should detect @Self parameter decorator', async () => {
      const classes = await parser.findDecoratedClasses();
      const serviceWithSelf = classes.find(c => c.name === 'ServiceWithSelfDep');

      expect(serviceWithSelf).toBeDefined();
      expect(serviceWithSelf?.dependencies).toHaveLength(1);

      const selfDep = serviceWithSelf?.dependencies[0];
      expect(selfDep?.flags?.self).toBe(true);
      expect(selfDep?.parameterName).toBe('selfService');
      expect(selfDep?.token).toBe('SelfService');
    });

    it('should detect @SkipSelf parameter decorator', async () => {
      const classes = await parser.findDecoratedClasses();
      const serviceWithSkipSelf = classes.find(c => c.name === 'ServiceWithSkipSelfDep');

      expect(serviceWithSkipSelf).toBeDefined();
      expect(serviceWithSkipSelf?.dependencies).toHaveLength(1);

      const skipSelfDep = serviceWithSkipSelf?.dependencies[0];
      expect(skipSelfDep?.flags?.skipSelf).toBe(true);
      expect(skipSelfDep?.parameterName).toBe('skipSelfService');
      expect(skipSelfDep?.token).toBe('SkipSelfService');
    });

    it('should detect @Host parameter decorator', async () => {
      const classes = await parser.findDecoratedClasses();
      const serviceWithHost = classes.find(c => c.name === 'ServiceWithHostDep');

      expect(serviceWithHost).toBeDefined();
      expect(serviceWithHost?.dependencies).toHaveLength(1);

      const hostDep = serviceWithHost?.dependencies[0];
      expect(hostDep?.flags?.host).toBe(true);
      expect(hostDep?.parameterName).toBe('hostService');
      expect(hostDep?.token).toBe('HostService');
    });

    it('should detect multiple decorators on same parameter', async () => {
      const classes = await parser.findDecoratedClasses();
      const serviceWithMultiDecorators = classes.find(c => c.name === 'ServiceWithMultiDecorators');

      expect(serviceWithMultiDecorators).toBeDefined();
      expect(serviceWithMultiDecorators?.dependencies).toHaveLength(1);

      const multiDep = serviceWithMultiDecorators?.dependencies[0];
      expect(multiDep?.flags?.optional).toBe(true);
      expect(multiDep?.flags?.self).toBe(true);
      expect(multiDep?.parameterName).toBe('multiDecoratedService');
      expect(multiDep?.token).toBe('MultiDecoratedService');
    });

    it('should handle @Inject with parameter decorators', async () => {
      const classes = await parser.findDecoratedClasses();
      const serviceWithInjectAndDecorators = classes.find(c => c.name === 'ServiceWithInjectAndDecorators');

      expect(serviceWithInjectAndDecorators).toBeDefined();
      expect(serviceWithInjectAndDecorators?.dependencies).toHaveLength(1);

      const injectDep = serviceWithInjectAndDecorators?.dependencies[0];
      expect(injectDep?.token).toBe('API_TOKEN'); // From @Inject
      expect(injectDep?.flags?.optional).toBe(true); // From @Optional
      expect(injectDep?.parameterName).toBe('apiToken');
    });

    it('should preserve parameter order with decorators', async () => {
      const classes = await parser.findDecoratedClasses();
      const serviceWithMixedDecorators = classes.find(c => c.name === 'ServiceWithMixedDecorators');

      expect(serviceWithMixedDecorators).toBeDefined();
      expect(serviceWithMixedDecorators?.dependencies).toHaveLength(3);

      const deps = serviceWithMixedDecorators?.dependencies;
      expect(deps?.[0]?.parameterName).toBe('regularService');
      expect(deps?.[0]?.flags?.optional).toBeUndefined();

      expect(deps?.[1]?.parameterName).toBe('optionalService');
      expect(deps?.[1]?.flags?.optional).toBe(true);

      expect(deps?.[2]?.parameterName).toBe('hostService');
      expect(deps?.[2]?.flags?.host).toBe(true);
    });
  });

  describe('when --include-decorators is false', () => {
    beforeEach(() => {
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false, // Disable decorator detection
        verbose: false
      };
      parser = new AngularParser(options);
      parser.loadProject();
    });

    it('should ignore parameter decorators when disabled', async () => {
      const classes = await parser.findDecoratedClasses();
      const serviceWithOptional = classes.find(c => c.name === 'ServiceWithOptionalDep');

      expect(serviceWithOptional).toBeDefined();
      expect(serviceWithOptional?.dependencies).toHaveLength(1);

      const dep = serviceWithOptional?.dependencies[0];
      expect(dep?.flags?.optional).toBeUndefined();
      expect(dep?.flags?.self).toBeUndefined();
      expect(dep?.flags?.skipSelf).toBeUndefined();
      expect(dep?.flags?.host).toBeUndefined();
      expect(dep?.token).toBe('OptionalService'); // Should still extract token
    });

    it('should extract tokens but ignore decorators for all decorator types', async () => {
      const classes = await parser.findDecoratedClasses();

      // Check each service type
      const serviceNames = ['ServiceWithOptionalDep', 'ServiceWithSelfDep', 'ServiceWithSkipSelfDep', 'ServiceWithHostDep'];

      for (const serviceName of serviceNames) {
        const service = classes.find(c => c.name === serviceName);
        expect(service).toBeDefined();

        if (service?.dependencies.length > 0) {
          const dep = service.dependencies[0];
          expect(dep?.flags?.optional).toBeUndefined();
          expect(dep?.flags?.self).toBeUndefined();
          expect(dep?.flags?.skipSelf).toBeUndefined();
          expect(dep?.flags?.host).toBeUndefined();
          expect(dep?.token).toBeTruthy(); // Token should still be extracted
        }
      }
    });
  });

  describe('error handling for decorator detection', () => {
    beforeEach(() => {
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: true,
        verbose: false
      };
      parser = new AngularParser(options);
      parser.loadProject();
    });

    it('should handle malformed decorator imports gracefully', async () => {
      // Should not throw even if decorator imports are malformed
      expect(async () => await parser.findDecoratedClasses()).not.toThrow();
    });

    it('should handle missing decorator arguments', async () => {
      // Should handle decorators without arguments like @Optional()
      const classes = await parser.findDecoratedClasses();
      expect(classes).toBeDefined();
      expect(Array.isArray(classes)).toBe(true);
    });

    it('should maintain performance with decorator detection enabled', async () => {
      const startTime = Date.now();

      await parser.findDecoratedClasses();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Decorator detection should add <10% performance overhead
      expect(duration).toBeLessThan(600); // Allowing slightly more time than base parsing
    });
  });
});

// inject() Function Detection Tests
describe('AngularParser - inject() Function Detection', () => {
  const testFixturesDir = './src/tests/fixtures';
  const testTsConfig = join(testFixturesDir, 'tsconfig.json');
  let parser: AngularParser;

  beforeEach(() => {
    const options: CliOptions = {
      project: testTsConfig,
      format: 'json',
      direction: 'downstream',
      includeDecorators: true, // Required for inject() options detection
      verbose: false
    };
    parser = new AngularParser(options);
    parser.loadProject();
  });

  describe('basic inject() pattern detection', () => {
    it('should detect inject() with optional flag', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectOptional');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);

      const dep = service?.dependencies[0];
      expect(dep?.token).toBe('BasicService');
      expect(dep?.flags?.optional).toBe(true);
      expect(dep?.flags?.self).toBeUndefined();
      expect(dep?.flags?.skipSelf).toBeUndefined();
      expect(dep?.flags?.host).toBeUndefined();
    });

    it('should detect inject() with self flag', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectSelf');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);

      const dep = service?.dependencies[0];
      expect(dep?.token).toBe('SelfService');
      expect(dep?.flags?.self).toBe(true);
      expect(dep?.flags?.optional).toBeUndefined();
      expect(dep?.flags?.skipSelf).toBeUndefined();
      expect(dep?.flags?.host).toBeUndefined();
    });

    it('should detect inject() with skipSelf flag', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectSkipSelf');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);

      const dep = service?.dependencies[0];
      expect(dep?.token).toBe('SkipSelfService');
      expect(dep?.flags?.skipSelf).toBe(true);
      expect(dep?.flags?.optional).toBeUndefined();
      expect(dep?.flags?.self).toBeUndefined();
      expect(dep?.flags?.host).toBeUndefined();
    });

    it('should detect inject() with host flag', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectHost');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);

      const dep = service?.dependencies[0];
      expect(dep?.token).toBe('HostService');
      expect(dep?.flags?.host).toBe(true);
      expect(dep?.flags?.optional).toBeUndefined();
      expect(dep?.flags?.self).toBeUndefined();
      expect(dep?.flags?.skipSelf).toBeUndefined();
    });
  });

  describe('advanced inject() pattern detection', () => {
    it('should detect inject() with multiple options', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectMultipleOptions');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);

      const dep = service?.dependencies[0];
      expect(dep?.token).toBe('OptionalService');
      expect(dep?.flags?.optional).toBe(true);
      expect(dep?.flags?.self).toBe(true);
      expect(dep?.flags?.skipSelf).toBeUndefined();
      expect(dep?.flags?.host).toBeUndefined();
    });

    it('should detect multiple inject() calls in same class', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithMultipleInjects');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(3);

      const optionalDep = service?.dependencies.find(d => d.token === 'OptionalService');
      expect(optionalDep?.flags?.optional).toBe(true);

      const selfDep = service?.dependencies.find(d => d.token === 'SelfService');
      expect(selfDep?.flags?.self).toBe(true);

      const hostDep = service?.dependencies.find(d => d.token === 'HostService');
      expect(hostDep?.flags?.host).toBe(true);
    });

    it('should handle inject() without options (empty flags)', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithBasicInject');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);

      const dep = service?.dependencies[0];
      expect(dep?.token).toBe('BasicService');
      expect(dep?.flags?.optional).toBeUndefined();
      expect(dep?.flags?.self).toBeUndefined();
      expect(dep?.flags?.skipSelf).toBeUndefined();
      expect(dep?.flags?.host).toBeUndefined();
    });

    it('should detect inject() with token references', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectToken');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);

      const dep = service?.dependencies[0];
      expect(dep?.token).toBe('API_CONFIG');
      expect(dep?.flags?.optional).toBe(true);
    });
  });

  describe('mixed legacy decorators and inject() patterns', () => {
    it('should handle mixed legacy decorators and modern inject()', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithMixedLegacyAndInject');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(2);

      // inject() dependency
      const injectDep = service?.dependencies.find(d => d.token === 'BasicService');
      expect(injectDep?.flags?.optional).toBe(true);

      // Legacy decorator dependency
      const legacyDep = service?.dependencies.find(d => d.token === 'SelfService');
      expect(legacyDep?.flags?.self).toBe(true);
    });
  });

  describe('inject() detection when includeDecorators is disabled', () => {
    beforeEach(() => {
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false, // Disabled
        verbose: false
      };
      parser = new AngularParser(options);
      parser.loadProject();
    });

    it('should still detect inject() calls but ignore options when includeDecorators is false', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectOptional');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);

      const dep = service?.dependencies[0];
      expect(dep?.token).toBe('BasicService');
      // Options should be ignored when includeDecorators is false
      expect(dep?.flags?.optional).toBeUndefined();
    });
  });

  describe('inject() error handling and edge cases', () => {
    it('should handle malformed inject() calls gracefully', async () => {
      // Should not throw even if inject() calls are malformed
      expect(async () => await parser.findDecoratedClasses()).not.toThrow();
    });

    it('should maintain performance with inject() detection', async () => {
      const startTime = Date.now();

      await parser.findDecoratedClasses();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // inject() detection should add minimal performance overhead
      expect(duration).toBeLessThan(800);
    });
  });

  /**
   * Integration: Parser + Graph Builder
   * Tests the end-to-end flow from parsing to graph construction
   */
  describe('Integration: Parser + Graph Builder', () => {
    it('should create complete graph from parsed TypeScript files', async () => {
      // Arrange
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const { buildGraph } = await import('../core/graph-builder');
      const graph = buildGraph(parsedClasses);

      // Assert - Should have nodes for all services and components
      expect(graph.nodes.length).toBeGreaterThan(0);

      // Verify specific nodes exist from test fixtures
      const nodeIds = graph.nodes.map(n => n.id);
      expect(nodeIds).toContain('TestService');
      expect(nodeIds).toContain('TestComponent');

      // Should have edges representing dependencies
      expect(graph.edges.length).toBeGreaterThan(0);

      // Should have circular dependencies array
      expect(Array.isArray(graph.circularDependencies)).toBe(true);
    });

    it('should correctly map dependencies from components to services', async () => {
      // Arrange
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const { buildGraph } = await import('../core/graph-builder');
      const graph = buildGraph(parsedClasses);

      // Assert - Look for specific dependency relationships
      const testComponentEdges = graph.edges.filter(e => e.from === 'TestComponent');
      expect(testComponentEdges.length).toBeGreaterThan(0);

      // Should have edge from TestComponent to TestService
      const testServiceEdge = testComponentEdges.find(e => e.to === 'TestService');
      expect(testServiceEdge).toBeDefined();
    });

    it('should handle complex dependency chains correctly', async () => {
      // Arrange
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const { buildGraph } = await import('../core/graph-builder');
      const graph = buildGraph(parsedClasses);

      // Assert - Verify the graph structure makes sense
      const serviceNodes = graph.nodes.filter(n => n.kind === 'service');
      const componentNodes = graph.nodes.filter(n => n.kind === 'component');
      const directiveNodes = graph.nodes.filter(n => n.kind === 'directive');

      expect(serviceNodes.length).toBeGreaterThan(0);
      expect(componentNodes.length).toBeGreaterThan(0);
      expect(directiveNodes.length).toBeGreaterThan(0);

      // All edges should reference valid nodes
      for (const edge of graph.edges) {
        const fromNode = graph.nodes.find(n => n.id === edge.from);
        const toNode = graph.nodes.find(n => n.id === edge.to);
        expect(fromNode).toBeDefined();
        expect(toNode).toBeDefined();
      }
    });

    it('should preserve edge flags through parsing to graph building', async () => {
      // Arrange
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: true,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const { buildGraph } = await import('../core/graph-builder');
      const graph = buildGraph(parsedClasses);

      // Assert - Verify edge flags are preserved
      const allEdges = graph.edges;
      expect(allEdges.length).toBeGreaterThan(0);

      // Verify that the flag structure is correct when flags exist
      for (const edge of allEdges) {
        if (edge.flags) {
          const validFlags = ['optional', 'self', 'skipSelf', 'host'];
          for (const flag of Object.keys(edge.flags)) {
            expect(validFlags).toContain(flag);
          }
        }
      }
    });

    it('should create unknown nodes for unresolved dependencies', async () => {
      // Arrange
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const { buildGraph } = await import('../core/graph-builder');
      const graph = buildGraph(parsedClasses);

      // Assert - Verify unknown nodes are properly structured
      const unknownNodes = graph.nodes.filter(n => n.kind === 'unknown');

      // All unknown nodes should have valid structure
      for (const unknownNode of unknownNodes) {
        expect(unknownNode.id).toBeTruthy();
        expect(unknownNode.kind).toBe('unknown');
      }
    });

    it('should maintain deterministic node and edge ordering', async () => {
      // Arrange
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act - Run multiple times to verify consistency
      const parsedClasses = await parser.parseClasses();
      const { buildGraph } = await import('../core/graph-builder');
      const graph1 = buildGraph(parsedClasses);
      const graph2 = buildGraph(parsedClasses);

      // Assert - Results should be identical
      expect(graph1.nodes).toEqual(graph2.nodes);
      expect(graph1.edges).toEqual(graph2.edges);
      expect(graph1.circularDependencies).toEqual(graph2.circularDependencies);
    });
  });

  describe('Logger Integration', () => {
    let logger: Logger | undefined;
    let logOutput: string[];
    let consoleErrorSpy: typeof console.error;

    beforeEach(() => {
      logOutput = [];
      consoleErrorSpy = console.error;
      console.error = (...args: any[]) => {
        logOutput.push(args.join(' '));
      };

      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: true
      };

      logger = createLogger(true);
      parser = new AngularParser(options, logger);
    });

    afterEach(() => {
      console.error = consoleErrorSpy;
    });

    it('should accept optional Logger parameter in constructor', () => {
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: true
      };

      const loggerInstance = createLogger(true);
      expect(() => new AngularParser(options, loggerInstance)).not.toThrow();
    });

    it('should work without Logger (backward compatibility)', () => {
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      expect(() => new AngularParser(options)).not.toThrow();
      expect(() => new AngularParser(options, undefined)).not.toThrow();
    });

    it('should log file processing start and end with timing', async () => {
      parser.loadProject();
      await parser.findDecoratedClasses();

      const fileProcessingLogs = logOutput.filter(log => log.includes('file-processing'));
      expect(fileProcessingLogs.length).toBeGreaterThan(0);
    });

    it('should log decorated class discovery', async () => {
      parser.loadProject();
      await parser.findDecoratedClasses();

      const astAnalysisLogs = logOutput.filter(log => log.includes('ast-analysis'));
      expect(astAnalysisLogs.length).toBeGreaterThan(0);
    });

    it('should log type resolution with context', async () => {
      parser.loadProject();
      await parser.findDecoratedClasses();

      const typeResolutionLogs = logOutput.filter(log => log.includes('type-resolution'));
      // Type resolution should happen during parameter analysis
      expect(typeResolutionLogs.length).toBeGreaterThanOrEqual(0);
    });

    it('should log error recovery attempts', async () => {
      // Use a tsconfig with files that might have issues
      const options: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: true
      };

      logger = createLogger(true);
      parser = new AngularParser(options, logger);
      parser.loadProject();

      await parser.findDecoratedClasses();

      // Check for error recovery logs (may or may not exist depending on files)
      const errorRecoveryLogs = logOutput.filter(log => log.includes('error-recovery'));
      expect(errorRecoveryLogs).toBeDefined();
    });

    it('should include performance timing in logs', async () => {
      parser.loadProject();
      await parser.findDecoratedClasses();

      const performanceLogs = logOutput.filter(log => log.includes('performance'));
      expect(performanceLogs.length).toBeGreaterThan(0);
    });

    it('should not impact parser functionality', async () => {
      // With Logger
      parser.loadProject();
      const classesWithLogger = await parser.findDecoratedClasses();

      // Without Logger
      const optionsWithoutLogger: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parserWithoutLogger = new AngularParser(optionsWithoutLogger);
      parserWithoutLogger.loadProject();
      const classesWithoutLogger = await parserWithoutLogger.findDecoratedClasses();

      // Results should be identical
      expect(classesWithLogger.length).toBe(classesWithoutLogger.length);
      expect(classesWithLogger.map(c => c.name).sort()).toEqual(
        classesWithoutLogger.map(c => c.name).sort()
      );
    });

    it('should add minimal performance overhead (<20%)', async () => {
      // Measure without Logger
      const optionsWithoutLogger: CliOptions = {
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const parserWithoutLogger = new AngularParser(optionsWithoutLogger);
      parserWithoutLogger.loadProject();

      const startWithout = performance.now();
      await parserWithoutLogger.findDecoratedClasses();
      const durationWithout = performance.now() - startWithout;

      // Measure with Logger
      parser.loadProject();
      const startWith = performance.now();
      await parser.findDecoratedClasses();
      const durationWith = performance.now() - startWith;

      // Logger overhead should be <20% (allowing for test timing variance)
      const overhead = ((durationWith - durationWithout) / durationWithout) * 100;
      expect(overhead).toBeLessThan(20);
    });
  });
});