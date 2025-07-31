/**
 * Test suite for AngularParser - Project Loading (FR-01)
 * Following TDD methodology - RED phase (failing tests first)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
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