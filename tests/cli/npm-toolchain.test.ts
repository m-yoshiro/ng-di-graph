import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const pkgJsonPath = new URL('../../package.json', import.meta.url);
const packageJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as {
  scripts: Record<string, string>;
  engines?: Record<string, string>;
  bin?: Record<string, string>;
  main?: string;
  files?: string[];
  optionalDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('npm toolchain metadata', () => {
  it('declares npm-first scripts without Bun references', () => {
    const requiredScripts = [
      'dev',
      'build',
      'test',
      'test:watch',
      'test:coverage',
      'lint',
      'lint:fix',
      'format',
      'check',
      'typecheck',
      'clean',
      'prepublishOnly',
    ];

    requiredScripts.forEach((script) => {
      expect(packageJson.scripts[script]).toBeTypeOf('string');
      expect(packageJson.scripts[script].length).toBeGreaterThan(0);
    });

    Object.entries(packageJson.scripts).forEach(([, command]) => {
      expect(command).not.toMatch(/\bbun\b/i);
      expect(command).not.toMatch(/ts-node/);
    });

    expect(packageJson.scripts.dev).toContain('tsx');
    expect(packageJson.scripts['dev:node']).toContain('tsx');
  });

  it('enforces Node-only engines and outputs to dist/cli', () => {
    expect(packageJson.engines?.node).toMatch(/^>=\d+/);
    expect(packageJson.engines).not.toHaveProperty('bun');

    expect(packageJson.bin?.['ng-di-graph']).toBe('dist/cli/index.js');
    expect(packageJson.main).toBe('dist/cli/index.js');
    expect(packageJson.files).toContain('dist');
  });

  it('does not declare Bun optional dependencies', () => {
    expect(packageJson.optionalDependencies).toBeUndefined();
  });

  it('depends on tsx instead of ts-node', () => {
    expect(packageJson.devDependencies?.tsx).toBeDefined();
    expect(packageJson.devDependencies).not.toHaveProperty('ts-node');
  });
});
