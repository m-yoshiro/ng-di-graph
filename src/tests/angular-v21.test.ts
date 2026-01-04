import { describe, expect, it } from 'vitest';
import { AngularParser } from '../core/parser';
import type { CliOptions } from '../types';

const V21_TSCONFIG = './src/tests/fixtures/angular-v21/tsconfig.json';

describe('AngularParser - Angular v21 fixture', () => {
  it('parses Angular v21-style components and inject() usage', async () => {
    const options: CliOptions = {
      project: V21_TSCONFIG,
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      includeAngularCore: false,
      verbose: false,
    };

    const parser = new AngularParser(options);
    parser.loadProject();

    const classes = await parser.findDecoratedClasses();
    const component = classes.find((candidate) => candidate.name === 'V21Component');
    const service = classes.find((candidate) => candidate.name === 'V21Service');
    const noConstructor = classes.find((candidate) => candidate.name === 'NoConstructorComponent');
    const tokenComponent = classes.find((candidate) => candidate.name === 'TokenInjectComponent');

    expect(component?.kind).toBe('component');
    expect(service?.kind).toBe('service');

    const dependencyTokens = component?.dependencies.map((dep) => dep.token).sort() ?? [];
    expect(dependencyTokens).toEqual(['FormArrayDirective', 'V21Service'].sort());

    const noConstructorTokens = noConstructor?.dependencies.map((dep) => dep.token).sort() ?? [];
    expect(noConstructorTokens).toEqual(['V21Service']);

    const tokenDependencyTokens = tokenComponent?.dependencies.map((dep) => dep.token).sort() ?? [];
    expect(tokenDependencyTokens).toEqual(['V21_TOKEN']);

  });

  it('captures inject() options when includeDecorators is enabled', async () => {
    const options: CliOptions = {
      project: V21_TSCONFIG,
      format: 'json',
      direction: 'downstream',
      includeDecorators: true,
      includeAngularCore: false,
      verbose: false,
    };

    const parser = new AngularParser(options);
    parser.loadProject();

    const classes = await parser.findDecoratedClasses();
    const optionsComponent = classes.find(
      (candidate) => candidate.name === 'InjectWithOptionsComponent'
    );
    const optionalDependency = optionsComponent?.dependencies.find(
      (dep) => dep.parameterName === 'optionalService'
    );

    expect(optionalDependency?.token).toBe('V21Service');
    expect(optionalDependency?.flags).toEqual({ optional: true });
  });
});
