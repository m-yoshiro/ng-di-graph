/**
 * Common Test Utilities
 * Provides reusable helper functions for test setup and mocking
 */

import type { LogCategory, LogContext, Logger, LoggingStats } from '../../core/logger';
import { createLogger } from '../../core/logger';
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

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Lightweight stub logger that captures log events without touching the console.
 * Enables deterministic assertions in tests that need to observe instrumentation.
 */
export class StubLogger implements Logger {
  public readonly logs: Array<{
    level: LogLevel;
    category: LogCategory;
    message: string;
    context?: LogContext;
  }> = [];
  private readonly _timers = new Map<string, number>();
  private readonly _completedTimers = new Map<string, number>();
  private readonly _stats: LoggingStats = {
    totalLogs: 0,
    categoryCounts: {} as Record<LogCategory, number>,
    performanceMetrics: {
      totalTime: 0,
      fileProcessingTime: 0,
      graphBuildingTime: 0,
      outputGenerationTime: 0,
    },
    memoryUsage: {
      peakUsage: 0,
      currentUsage: 0,
    },
  };

  debug(category: LogCategory, message: string, context?: LogContext): void {
    this._record('debug', category, message, context);
  }

  info(category: LogCategory, message: string, context?: LogContext): void {
    this._record('info', category, message, context);
  }

  warn(category: LogCategory, message: string, context?: LogContext): void {
    this._record('warn', category, message, context);
  }

  error(category: LogCategory, message: string, context?: LogContext): void {
    this._record('error', category, message, context);
  }

  time(label: string): void {
    this._timers.set(label, performance.now());
  }

  timeEnd(label: string): number {
    const start = this._timers.get(label);
    if (start === undefined) {
      throw new Error(`Timer '${label}' was not started`);
    }
    const elapsed = performance.now() - start;
    this._timers.delete(label);
    this._completedTimers.set(label, elapsed);
    return elapsed;
  }

  getStats(): LoggingStats {
    return {
      ...this._stats,
      categoryCounts: { ...this._stats.categoryCounts },
      performanceMetrics: { ...this._stats.performanceMetrics },
      memoryUsage: { ...this._stats.memoryUsage },
    };
  }

  getCompletedTimerLabels(): string[] {
    return [...this._completedTimers.keys()];
  }

  getTimerDuration(label: string): number | undefined {
    return this._completedTimers.get(label);
  }

  private _record(
    level: LogLevel,
    category: LogCategory,
    message: string,
    context?: LogContext
  ): void {
    this.logs.push({ level, category, message, context });
    this._stats.totalLogs++;
    this._stats.categoryCounts[category] = (this._stats.categoryCounts[category] ?? 0) + 1;
  }
}

/**
 * Factory for stub logger instances so tests can avoid importing the class directly.
 */
export function createStubLogger(): StubLogger {
  return new StubLogger();
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
