/**
 * Logger Infrastructure for ng-di-graph
 * Provides structured logging with categories, performance timing, and memory tracking
 * Implements FR-12: Verbose mode support
 *
 * Usage:
 * ```typescript
 * const logger = createLogger(verbose);
 * logger?.info(LogCategory.FILE_PROCESSING, 'Processing file', { filePath: '/test.ts' });
 * logger?.time('operation');
 * // ... operation ...
 * const elapsed = logger?.timeEnd('operation');
 * const stats = logger?.getStats();
 * ```
 */

/**
 * Log category enumeration for structured logging
 * Each category represents a distinct phase of ng-di-graph processing
 */
export enum LogCategory {
  FILE_PROCESSING = 'file-processing',
  AST_ANALYSIS = 'ast-analysis',
  TYPE_RESOLUTION = 'type-resolution',
  GRAPH_CONSTRUCTION = 'graph-construction',
  FILTERING = 'filtering',
  ERROR_RECOVERY = 'error-recovery',
  PERFORMANCE = 'performance',
}

/**
 * Optional context information attached to log messages
 * Provides additional debugging context for verbose mode
 */
export interface LogContext {
  filePath?: string; // Source file path being processed
  lineNumber?: number; // Line number in source file
  className?: string; // Class name being analyzed
  methodName?: string; // Method name being executed
  nodeId?: string; // Graph node identifier
  timing?: number; // Performance timing in milliseconds
  memoryUsage?: number; // Memory usage in bytes
  [key: string]: unknown; // Additional custom fields
}

/**
 * Logger interface for structured logging
 * Supports log levels, performance timing, and statistics tracking
 */
export interface Logger {
  debug(category: LogCategory, message: string, context?: LogContext): void;
  info(category: LogCategory, message: string, context?: LogContext): void;
  warn(category: LogCategory, message: string, context?: LogContext): void;
  error(category: LogCategory, message: string, context?: LogContext): void;
  time(label: string): void;
  timeEnd(label: string): number;
  getStats(): LoggingStats;
}

/**
 * Aggregated logging statistics
 * Provides insights into verbose mode execution
 */
export interface LoggingStats {
  totalLogs: number; // Total number of logs emitted
  categoryCounts: Record<LogCategory, number>; // Logs per category
  performanceMetrics: {
    totalTime: number; // Total execution time (ms)
    fileProcessingTime: number; // Time spent processing files (ms)
    graphBuildingTime: number; // Time spent building graph (ms)
    outputGenerationTime: number; // Time spent generating output (ms)
  };
  memoryUsage: {
    peakUsage: number; // Peak memory usage (bytes)
    currentUsage: number; // Current memory usage (bytes)
  };
}

/**
 * Internal timer tracking entry
 * Stores performance timer state
 */
export interface TimerEntry {
  startTime: number;
  category?: LogCategory;
}

/**
 * Factory function for Logger creation
 * Returns undefined when verbose is false (no-op pattern)
 *
 * @param verbose - Enable verbose logging
 * @returns Logger instance or undefined
 *
 * @example
 * ```typescript
 * const logger = createLogger(cliOptions.verbose);
 * logger?.info(LogCategory.FILE_PROCESSING, 'Starting processing');
 * ```
 */
export function createLogger(verbose: boolean): Logger | undefined {
  return verbose ? new LoggerImpl() : undefined;
}

/**
 * Logger implementation (internal)
 * Provides structured logging with minimal performance overhead
 */
class LoggerImpl implements Logger {
  private _timers: Map<string, TimerEntry>;
  private _stats: LoggingStats;
  private _peakMemory: number;

  constructor() {
    this._timers = new Map();
    this._stats = {
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
    this._peakMemory = 0;
  }

  debug(category: LogCategory, message: string, context?: LogContext): void {
    this._log('DEBUG', category, message, context);
  }

  info(category: LogCategory, message: string, context?: LogContext): void {
    this._log('INFO', category, message, context);
  }

  warn(category: LogCategory, message: string, context?: LogContext): void {
    this._log('WARN', category, message, context);
  }

  error(category: LogCategory, message: string, context?: LogContext): void {
    this._log('ERROR', category, message, context);
  }

  time(label: string): void {
    this._timers.set(label, {
      startTime: performance.now(),
    });
  }

  timeEnd(label: string): number {
    const timer = this._timers.get(label);
    if (!timer) {
      throw new Error(`Timer '${label}' does not exist`);
    }
    const elapsed = performance.now() - timer.startTime;
    this._timers.delete(label);
    return elapsed;
  }

  getStats(): LoggingStats {
    // Update current memory usage
    const memUsage = process.memoryUsage();
    this._stats.memoryUsage.currentUsage = memUsage.heapUsed;

    return { ...this._stats };
  }

  private _log(level: string, category: LogCategory, message: string, context?: LogContext): void {
    // Update statistics
    this._stats.totalLogs++;
    this._stats.categoryCounts[category] = (this._stats.categoryCounts[category] || 0) + 1;

    // Track peak memory
    const memUsage = process.memoryUsage().heapUsed;
    if (memUsage > this._peakMemory) {
      this._peakMemory = memUsage;
      this._stats.memoryUsage.peakUsage = memUsage;
    }

    // Format and output log
    const formattedLog = this._formatLog(level, category, message, context);
    console.error(formattedLog); // Use stderr to separate from tool output
  }

  private _formatLog(
    level: string,
    category: LogCategory,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level}] [${category}] ${message}${contextStr}`;
  }
}
