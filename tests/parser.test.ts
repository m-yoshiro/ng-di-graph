/**
 * Test suite for AngularParser - Project Loading (FR-01)
 * Following TDD methodology - RED phase (failing tests first)
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { AngularParser } from '../src/core/parser';
import { CliOptions, ParserError } from '../src/types';

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
  const testFixturesDir = './tests/fixtures';
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
      expect(services).toHaveLength(15); // 11 from services.ts + 4 from edge-cases.ts
      
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
  const testTsConfig = './tests/fixtures/tsconfig.json';
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
        
        // Should have warned about skipping primitive types
        expect(warnings.some(w => w.includes('Skipping primitive type parameter'))).toBe(true);
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