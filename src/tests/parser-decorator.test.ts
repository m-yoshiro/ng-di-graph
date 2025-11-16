import { describe, it, expect, beforeEach } from 'bun:test';
import { AngularParser } from '../core/parser';
import type { CliOptions } from '../types';

describe('Decorator Detection (FR-04)', () => {
  const testTsConfig = './src/tests/fixtures/tsconfig.json';
  let parser: AngularParser;

  beforeEach(() => {
    const options: CliOptions = {
      project: testTsConfig,
      format: 'json',
      direction: 'downstream',
      includeDecorators: true,
      verbose: false,
    };
    parser = new AngularParser(options);
  });

  describe('Parameter Decorator Flags', () => {
    it('should detect @Optional decorator on constructor parameter', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithOptionalDep');

      expect(service).toBeDefined();
      expect(service?.dependencies).toHaveLength(1);
      expect(service?.dependencies[0].token).toBe('OptionalService');
      expect(service?.dependencies[0].flags).toEqual({ optional: true });
    });

    it('should detect @Self decorator on constructor parameter', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithSelfDep');

      expect(service?.dependencies[0].token).toBe('SelfService');
      expect(service?.dependencies[0].flags).toEqual({ self: true });
    });

    it('should detect @SkipSelf decorator on constructor parameter', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithSkipSelfDep');

      expect(service?.dependencies[0].token).toBe('SkipSelfService');
      expect(service?.dependencies[0].flags).toEqual({ skipSelf: true });
    });

    it('should detect @Host decorator on constructor parameter', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithHostDep');

      expect(service?.dependencies[0].token).toBe('HostService');
      expect(service?.dependencies[0].flags).toEqual({ host: true });
    });

    it('should handle multiple decorators on same parameter', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithMultiDecorators');

      expect(service?.dependencies[0].flags).toEqual({
        optional: true,
        self: true,
      });
    });

    it('should handle mixed parameters (some with decorators, some without)', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithMixedDecorators');

      expect(service?.dependencies).toHaveLength(3);
      expect(service?.dependencies[0].flags).toEqual({}); // regular parameter
      expect(service?.dependencies[1].flags).toEqual({ optional: true });
      expect(service?.dependencies[2].flags).toEqual({ host: true });
    });

    it('should return empty flags when includeDecorators is false', async () => {
      const parserNoDecorators = new AngularParser({
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false,
      });

      const classes = await parserNoDecorators.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithOptionalDep');

      expect(service?.dependencies[0].flags).toEqual({});
    });

    it('should handle @Inject with @Optional together', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectAndDecorators');

      expect(service?.dependencies[0].token).toBe('API_TOKEN');
      expect(service?.dependencies[0].flags).toEqual({ optional: true });
    });
  });

  describe('Modern inject() Function', () => {
    it('should detect inject() with optional flag', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectOptional');

      expect(service).toBeDefined();
      // inject() in field-level, should be detected
      expect(service?.dependencies).toHaveLength(1);
      expect(service?.dependencies[0].token).toBe('BasicService');
      expect(service?.dependencies[0].flags).toEqual({ optional: true });
    });

    it('should detect inject() with self flag', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectSelf');

      expect(service?.dependencies[0].flags).toEqual({ self: true });
    });

    it('should detect inject() with skipSelf flag', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectSkipSelf');

      expect(service?.dependencies[0].flags).toEqual({ skipSelf: true });
    });

    it('should detect inject() with host flag', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectHost');

      expect(service?.dependencies[0].flags).toEqual({ host: true });
    });

    it('should handle combined options in inject()', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectMultipleOptions');

      expect(service?.dependencies[0].flags).toEqual({
        optional: true,
        self: true,
      });
    });

    it('should handle inject() without options', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithBasicInject');

      expect(service?.dependencies[0].token).toBe('BasicService');
      expect(service?.dependencies[0].flags).toEqual({});
    });

    it('should handle inject() with token reference', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectToken');

      expect(service?.dependencies[0].token).toBe('API_CONFIG');
      expect(service?.dependencies[0].flags).toEqual({ optional: true });
    });

    it('should handle mixed legacy decorators and inject()', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithMixedLegacyAndInject');

      expect(service?.dependencies).toHaveLength(2);
      // Dependencies can be in any order, so check both exist
      const tokens = service?.dependencies.map(d => d.token) || [];
      expect(tokens).toContain('BasicService');
      expect(tokens).toContain('SelfService');

      const basicDep = service?.dependencies.find(d => d.token === 'BasicService');
      const selfDep = service?.dependencies.find(d => d.token === 'SelfService');

      expect(basicDep?.flags).toEqual({ optional: true });
      expect(selfDep?.flags).toEqual({ self: true });
    });

    it('should respect includeDecorators flag for inject() options', async () => {
      const parserNoDecorators = new AngularParser({
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false,
      });

      const classes = await parserNoDecorators.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithInjectOptional');

      expect(service?.dependencies[0].flags).toEqual({});
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle parameters without any decorators', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithMixedDecorators');

      expect(service?.dependencies[0].token).toBe('RegularService');
      expect(service?.dependencies[0].flags).toEqual({});
    });

    it('should skip parameters with any/unknown types gracefully', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithAnyUnknown');

      // Service might not be parsed if it has only any/unknown params, or dependencies will be empty
      if (service) {
        expect(service.dependencies).toHaveLength(0);
      } else {
        // Service not found is also acceptable (filtered out)
        expect(service).toBeUndefined();
      }
    });

    it('should skip primitive types gracefully', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithPrimitives');

      // Should not include primitive type parameters
      expect(service?.dependencies).toHaveLength(0);
    });

    it('should handle services with no dependencies', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'RegularService');

      expect(service?.dependencies).toHaveLength(0);
    });

    it('should handle components with decorators', async () => {
      const classes = await parser.findDecoratedClasses();
      const component = classes.find(c => c.name === 'ComponentWithDecorators');

      if (component) {
        // Component may have dependencies with decorators
        expect(component.kind).toBe('component');
        component.dependencies.forEach(dep => {
          expect(dep.flags).toBeDefined();
        });
      }
    });

    it('should handle directives with decorators', async () => {
      const classes = await parser.findDecoratedClasses();
      const directive = classes.find(c => c.name === 'DirectiveWithDecorators');

      if (directive) {
        expect(directive.kind).toBe('directive');
        directive.dependencies.forEach(dep => {
          expect(dep.flags).toBeDefined();
        });
      }
    });
  });

  describe('Coverage and Completeness', () => {
    it('should find all services with decorator flags', async () => {
      const classes = await parser.findDecoratedClasses();
      const servicesWithDecorators = classes.filter(c =>
        c.kind === 'service' &&
        c.dependencies.some(dep => Object.keys(dep.flags || {}).length > 0)
      );

      // Should have multiple services with decorators from fixtures
      expect(servicesWithDecorators.length).toBeGreaterThan(5);
    });

    it('should correctly count all decorator types', async () => {
      const classes = await parser.findDecoratedClasses();
      let optionalCount = 0;
      let selfCount = 0;
      let skipSelfCount = 0;
      let hostCount = 0;

      classes.forEach(cls => {
        cls.dependencies.forEach(dep => {
          if (dep.flags?.optional) optionalCount++;
          if (dep.flags?.self) selfCount++;
          if (dep.flags?.skipSelf) skipSelfCount++;
          if (dep.flags?.host) hostCount++;
        });
      });

      // Should have detected multiple instances of each decorator type
      expect(optionalCount).toBeGreaterThan(0);
      expect(selfCount).toBeGreaterThan(0);
      expect(skipSelfCount).toBeGreaterThan(0);
      expect(hostCount).toBeGreaterThan(0);
    });

    it('should maintain consistency across multiple calls', async () => {
      const classes1 = await parser.findDecoratedClasses();
      const classes2 = await parser.findDecoratedClasses();

      expect(classes1).toEqual(classes2);
    });
  });

  describe('Verbose Mode Integration', () => {
    it('should work with verbose mode enabled', async () => {
      const verboseParser = new AngularParser({
        project: testTsConfig,
        format: 'json',
        direction: 'downstream',
        includeDecorators: true,
        verbose: true,
      });

      // Should not throw errors with verbose mode
      const classes = await verboseParser.findDecoratedClasses();
      expect(classes).toBeDefined();
      expect(classes.length).toBeGreaterThan(0);
    });

    it('should work without verbose mode', async () => {
      const classes = await parser.findDecoratedClasses();
      const service = classes.find(c => c.name === 'ServiceWithOptionalDep');

      expect(service?.dependencies[0].flags).toEqual({ optional: true });
    });
  });
});
