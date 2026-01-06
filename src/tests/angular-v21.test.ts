import { describe, expect, it } from 'vitest';
import { AngularParser } from '../core/parser';
import type { CliOptions } from '../types';

const V21_TSCONFIG = './src/tests/fixtures/angular-v21/tsconfig.json';

describe('AngularParser - Angular v21 fixture', () => {
  it('parses Angular v21-style components with FormArrayDirective', async () => {
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

    expect(component?.kind).toBe('component');

    const dependencyTokens = component?.dependencies.map((dep) => dep.token).sort() ?? [];
    expect(dependencyTokens).toEqual(['FormArrayDirective']);
  });
});
