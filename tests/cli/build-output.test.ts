import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..', '..');
const cliEntry = resolve(projectRoot, 'dist', 'cli', 'index.cjs');

describe.sequential('npm build output', () => {
  const runNpmScript = (script: string): void => {
    execFileSync('npm', ['run', script], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env },
    });
  };

  beforeAll(() => {
    runNpmScript('build');
  });

  it('bundles the CLI via npm run build and exposes --help', () => {
    expect(existsSync(cliEntry)).toBe(true);

    const bundledContents = readFileSync(cliEntry, 'utf-8');
    expect(bundledContents.startsWith('#!/usr/bin/env node')).toBe(true);

    const helpOutput = execFileSync('node', [cliEntry, '--help'], {
      cwd: projectRoot,
      encoding: 'utf-8',
    });

    expect(helpOutput).toContain('Usage: ng-di-graph');
    expect(helpOutput).toContain('Angular DI dependency graph CLI tool');
  });

  it('shows help output when run with no arguments', () => {
    const defaultOutput = execFileSync('node', [cliEntry], {
      cwd: projectRoot,
      encoding: 'utf-8',
    });

    expect(defaultOutput).toContain('Usage: ng-di-graph');
    expect(defaultOutput).toContain('Angular DI dependency graph CLI tool');
  });

  it('accepts positional file targets while resolving tsconfig via --project', () => {
    const output = execFileSync(
      'node',
      [
        cliEntry,
        './src/tests/fixtures/src/services.ts',
        './src/tests/fixtures/src/directives.ts',
        './src/tests/fixtures/src/components.ts',
        '--project',
        './src/tests/fixtures/tsconfig.json',
        '--format',
        'json',
      ],
      {
        cwd: projectRoot,
        encoding: 'utf-8',
      }
    );

    const parsed = JSON.parse(output) as { nodes: Array<{ id: string }>; edges: unknown[] };

    expect(parsed.nodes.length).toBeGreaterThan(0);
    expect(parsed.edges.length).toBeGreaterThan(0);
    expect(parsed.nodes.some((node) => node.id === 'TestComponent')).toBe(true);
  });
});
