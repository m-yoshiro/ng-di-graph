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
});
