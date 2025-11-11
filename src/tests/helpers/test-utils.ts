/**
 * Common Test Utilities
 * Provides reusable helper functions for test setup and mocking
 */

import { type Logger, createLogger } from '../../core/logger';
import { AngularParser } from '../../core/parser';
import type { CliOptions, Edge, Graph, Node } from '../../types';

/**
 * Default test fixtures directory path
 */
export const TEST_FIXTURES_DIR = './src/tests/fixtures';
export const TEST_TSCONFIG = `${TEST_FIXTURES_DIR}/tsconfig.json`;

/**
 * Create default CliOptions for testing
 * @param overrides - Partial options to override defaults
 * @returns Complete CliOptions object
 */
export function createTestCliOptions(overrides?: Partial<CliOptions>): CliOptions {
  return {
    project: TEST_TSCONFIG,
    format: 'json',
    direction: 'downstream',
    includeDecorators: false,
    verbose: false,
    ...overrides,
  };
}

/**
 * Create and initialize an AngularParser for testing
 * @param optionsOverrides - Optional CliOptions overrides
 * @param loadProject - Whether to automatically load the project (default: true)
 * @returns Initialized AngularParser instance
 */
export function createTestParser(
  optionsOverrides?: Partial<CliOptions>,
  loadProject = true
): AngularParser {
  const options = createTestCliOptions(optionsOverrides);
  const parser = new AngularParser(options);

  if (loadProject) {
    parser.loadProject();
  }

  return parser;
}

/**
 * Create a Logger instance for testing
 * @param verbose - Whether to enable verbose mode (default: false)
 * @returns Logger instance or undefined if verbose is false
 */
export function createTestLogger(verbose = false): Logger | undefined {
  return createLogger(verbose);
}

/**
 * Create a simple mock graph for testing
 * @param options - Optional graph customization
 * @returns Graph object
 */
export function createMockGraph(options?: {
  nodes?: Node[];
  edges?: Edge[];
  circularDependencies?: string[][];
}): Graph {
  return {
    nodes: options?.nodes || [
      { id: 'AppComponent', kind: 'component' },
      { id: 'TestService', kind: 'service' },
    ],
    edges: options?.edges || [{ from: 'AppComponent', to: 'TestService' }],
    circularDependencies: options?.circularDependencies || [],
  };
}

/**
 * Create a minimal empty graph
 * @returns Empty graph object
 */
export function createEmptyGraph(): Graph {
  return {
    nodes: [],
    edges: [],
    circularDependencies: [],
  };
}

/**
 * Mock console methods for testing CLI output
 * @returns Object with mocked console methods and restore function
 */
export function mockConsole(): {
  log: { calls: () => string[]; mock: typeof console.log };
  error: { calls: () => string[]; mock: typeof console.error };
  warn: { calls: () => string[]; mock: typeof console.warn };
  restore: () => void;
} {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  const logs: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  console.log = (...args: unknown[]) => logs.push(args.join(' '));
  console.error = (...args: unknown[]) => errors.push(args.join(' '));
  console.warn = (...args: unknown[]) => warnings.push(args.join(' '));

  return {
    log: { calls: () => logs, mock: console.log },
    error: { calls: () => errors, mock: console.error },
    warn: { calls: () => warnings, mock: console.warn },
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    },
  };
}

/**
 * Wait for async operations to complete
 * @param ms - Milliseconds to wait (default: 0)
 * @returns Promise that resolves after specified time
 */
export async function wait(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Reset warning state for parser tests
 * Ensures clean test isolation
 */
export function resetParserState(): void {
  AngularParser.resetWarningState();
}
