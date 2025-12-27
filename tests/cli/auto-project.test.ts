import { beforeAll, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(__dirname, '..', '..');
const cliEntry = resolve(projectRoot, 'dist', 'cli', 'index.cjs');

type CliResult = {
  status: number;
  stdout: string;
  stderr: string;
};

const runNpmScript = (script: string): void => {
  execFileSync('npm', ['run', script], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
};

const runCli = (args: string[], cwd: string): CliResult => {
  const result = spawnSync('node', [cliEntry, ...args], {
    cwd,
    encoding: 'utf-8',
    env: { ...process.env },
  });

  return {
    status: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? (result.error ? String(result.error) : ''),
  };
};

const parseJsonGraph = (output: string): { nodes: Array<{ id: string }>; edges: unknown[] } => {
  const trimmed = output.trim();
  return JSON.parse(trimmed) as { nodes: Array<{ id: string }>; edges: unknown[] };
};

describe('CLI auto tsconfig discovery', () => {
  beforeAll(() => {
    runNpmScript('build');
  });

  it('discovers tsconfig.json when cwd is below a project root', () => {
    const fixtureSrcDir = resolve(projectRoot, 'src', 'tests', 'fixtures', 'src');

    const result = runCli(['--format', 'json'], fixtureSrcDir);

    expect(result.status).toBe(0);
    const graph = parseJsonGraph(result.stdout);
    expect(graph.nodes.some((node) => node.id === 'TestComponent')).toBe(true);
  });

  it('discovers tsconfig.json from common ancestor of file targets', () => {
    const servicesPath = resolve(
      projectRoot,
      'src',
      'tests',
      'fixtures',
      'src',
      'services.ts'
    );
    const componentsPath = resolve(
      projectRoot,
      'src',
      'tests',
      'fixtures',
      'src',
      'components.ts'
    );

    const result = runCli([servicesPath, componentsPath, '--format', 'json'], projectRoot);

    expect(result.status).toBe(0);
    const graph = parseJsonGraph(result.stdout);
    expect(graph.nodes.some((node) => node.id === 'BasicService')).toBe(true);
    expect(graph.nodes.some((node) => node.id === 'BasicComponent')).toBe(true);
  });

  it('fails when file targets span multiple project roots', () => {
    const alphaPath = resolve(
      projectRoot,
      'src',
      'tests',
      'fixtures',
      'auto-project-a',
      'src',
      'alpha.service.ts'
    );
    const betaPath = resolve(
      projectRoot,
      'src',
      'tests',
      'fixtures',
      'auto-project-b',
      'src',
      'beta.service.ts'
    );

    const result = runCli([alphaPath, betaPath, '--format', 'json'], projectRoot);

    expect(result.status).not.toBe(0);
    expect(result.stderr.toLowerCase()).toContain('multiple');
    expect(result.stderr).toContain('--project');
  });

  it('prefers the nearest tsconfig in nested workspaces', () => {
    const appSourceDir = resolve(
      projectRoot,
      'src',
      'tests',
      'fixtures',
      'monorepo',
      'packages',
      'app',
      'src'
    );

    const result = runCli(['--format', 'json'], appSourceDir);

    expect(result.status).toBe(0);
    const graph = parseJsonGraph(result.stdout);
    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toContain('MonorepoAppService');
    expect(nodeIds).not.toContain('MonorepoLibService');
  });
});
