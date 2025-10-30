/**
 * Logger Core Interface Tests
 * Following TDD methodology: RED-GREEN-REFACTOR
 * Tests written FIRST before implementation
 */

import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { LogCategory, createLogger, type Logger, type LoggingStats } from '../core/logger';

describe('Logger - Core Interface', () => {
  let consoleErrorSpy: typeof console.error;
  let logOutput: string[];

  beforeEach(() => {
    logOutput = [];
    consoleErrorSpy = console.error;
    console.error = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.error = consoleErrorSpy;
  });

  describe('createLogger factory function', () => {
    it('should create Logger instance when verbose is true', () => {
      const logger = createLogger(true);
      expect(logger).toBeDefined();
      expect(typeof logger?.debug).toBe('function');
      expect(typeof logger?.info).toBe('function');
      expect(typeof logger?.warn).toBe('function');
      expect(typeof logger?.error).toBe('function');
    });

    it('should return undefined when verbose is false', () => {
      const logger = createLogger(false);
      expect(logger).toBeUndefined();
    });
  });

  describe('Log level methods', () => {
    it('should emit debug logs with category and message', () => {
      const logger = createLogger(true);
      logger?.debug(LogCategory.FILE_PROCESSING, 'Test debug message');

      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('DEBUG');
      expect(logOutput[0]).toContain('file-processing');
      expect(logOutput[0]).toContain('Test debug message');
    });

    it('should emit info logs with category and message', () => {
      const logger = createLogger(true);
      logger?.info(LogCategory.AST_ANALYSIS, 'Test info message');

      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('INFO');
      expect(logOutput[0]).toContain('ast-analysis');
      expect(logOutput[0]).toContain('Test info message');
    });

    it('should emit warn logs with category and message', () => {
      const logger = createLogger(true);
      logger?.warn(LogCategory.TYPE_RESOLUTION, 'Test warn message');

      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('WARN');
      expect(logOutput[0]).toContain('type-resolution');
      expect(logOutput[0]).toContain('Test warn message');
    });

    it('should emit error logs with category and message', () => {
      const logger = createLogger(true);
      logger?.error(LogCategory.ERROR_RECOVERY, 'Test error message');

      expect(logOutput.length).toBe(1);
      expect(logOutput[0]).toContain('ERROR');
      expect(logOutput[0]).toContain('error-recovery');
      expect(logOutput[0]).toContain('Test error message');
    });

    it('should not emit logs when verbose is false', () => {
      const logger = createLogger(false);
      logger?.debug(LogCategory.FILE_PROCESSING, 'Should not appear');
      logger?.info(LogCategory.AST_ANALYSIS, 'Should not appear');
      logger?.warn(LogCategory.TYPE_RESOLUTION, 'Should not appear');
      logger?.error(LogCategory.ERROR_RECOVERY, 'Should not appear');

      expect(logOutput.length).toBe(0);
    });
  });

  describe('Log categories', () => {
    it('should support all required log categories', () => {
      expect(LogCategory.FILE_PROCESSING).toBe('file-processing');
      expect(LogCategory.AST_ANALYSIS).toBe('ast-analysis');
      expect(LogCategory.TYPE_RESOLUTION).toBe('type-resolution');
      expect(LogCategory.GRAPH_CONSTRUCTION).toBe('graph-construction');
      expect(LogCategory.FILTERING).toBe('filtering');
      expect(LogCategory.ERROR_RECOVERY).toBe('error-recovery');
      expect(LogCategory.PERFORMANCE).toBe('performance');
    });

    it('should log with different categories correctly', () => {
      const logger = createLogger(true);

      logger?.debug(LogCategory.FILE_PROCESSING, 'Message 1');
      logger?.info(LogCategory.GRAPH_CONSTRUCTION, 'Message 2');
      logger?.warn(LogCategory.FILTERING, 'Message 3');

      expect(logOutput[0]).toContain('file-processing');
      expect(logOutput[1]).toContain('graph-construction');
      expect(logOutput[2]).toContain('filtering');
    });
  });

  describe('Log context', () => {
    it('should include context in log output', () => {
      const logger = createLogger(true);
      logger?.info(LogCategory.FILE_PROCESSING, 'Processing file', {
        filePath: '/test/file.ts',
        className: 'TestClass'
      });

      expect(logOutput[0]).toContain('filePath');
      expect(logOutput[0]).toContain('/test/file.ts');
      expect(logOutput[0]).toContain('className');
      expect(logOutput[0]).toContain('TestClass');
    });

    it('should handle logs without context', () => {
      const logger = createLogger(true);
      logger?.info(LogCategory.FILE_PROCESSING, 'No context message');

      expect(logOutput[0]).toContain('No context message');
      expect(logOutput.length).toBe(1);
    });

    it('should support all context fields', () => {
      const logger = createLogger(true);
      logger?.debug(LogCategory.AST_ANALYSIS, 'Full context', {
        filePath: '/test/file.ts',
        lineNumber: 42,
        className: 'TestClass',
        methodName: 'testMethod',
        nodeId: 'node-123',
        timing: 123.45,
        memoryUsage: 1024,
        customField: 'custom value'
      });

      expect(logOutput[0]).toContain('filePath');
      expect(logOutput[0]).toContain('lineNumber');
      expect(logOutput[0]).toContain('className');
      expect(logOutput[0]).toContain('methodName');
      expect(logOutput[0]).toContain('nodeId');
      expect(logOutput[0]).toContain('timing');
      expect(logOutput[0]).toContain('memoryUsage');
      expect(logOutput[0]).toContain('customField');
    });
  });

  describe('Statistics tracking', () => {
    it('should track total log count', () => {
      const logger = createLogger(true);

      logger?.debug(LogCategory.FILE_PROCESSING, 'Log 1');
      logger?.info(LogCategory.AST_ANALYSIS, 'Log 2');
      logger?.warn(LogCategory.TYPE_RESOLUTION, 'Log 3');

      const stats = logger?.getStats();
      expect(stats?.totalLogs).toBe(3);
    });

    it('should track category counts', () => {
      const logger = createLogger(true);

      logger?.debug(LogCategory.FILE_PROCESSING, 'Log 1');
      logger?.info(LogCategory.FILE_PROCESSING, 'Log 2');
      logger?.warn(LogCategory.AST_ANALYSIS, 'Log 3');

      const stats = logger?.getStats();
      expect(stats?.categoryCounts[LogCategory.FILE_PROCESSING]).toBe(2);
      expect(stats?.categoryCounts[LogCategory.AST_ANALYSIS]).toBe(1);
    });

    it('should return valid statistics structure', () => {
      const logger = createLogger(true);
      const stats = logger?.getStats();

      expect(stats).toBeDefined();
      expect(typeof stats?.totalLogs).toBe('number');
      expect(typeof stats?.categoryCounts).toBe('object');
      expect(typeof stats?.performanceMetrics).toBe('object');
      expect(typeof stats?.memoryUsage).toBe('object');
    });
  });

  describe('Log formatting', () => {
    it('should include timestamp in log output', () => {
      const logger = createLogger(true);
      logger?.info(LogCategory.FILE_PROCESSING, 'Test message');

      // Log should contain ISO timestamp format
      expect(logOutput[0]).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should format logs with level, category, and message', () => {
      const logger = createLogger(true);
      logger?.info(LogCategory.GRAPH_CONSTRUCTION, 'Building graph');

      const log = logOutput[0];
      expect(log).toContain('[INFO]');
      expect(log).toContain('[graph-construction]');
      expect(log).toContain('Building graph');
    });
  });
});

describe('Logger - Performance Timing', () => {
  it('should start timing operation with time(label)', () => {
    const logger = createLogger(true);
    expect(() => logger?.time('test-operation')).not.toThrow();
  });

  it('should return elapsed time with timeEnd(label)', () => {
    const logger = createLogger(true);
    logger?.time('test-operation');

    // Small delay
    const start = Date.now();
    while (Date.now() - start < 10) {
      // Wait ~10ms
    }

    const elapsed = logger?.timeEnd('test-operation');
    expect(elapsed).toBeGreaterThan(0);
    expect(elapsed).toBeGreaterThanOrEqual(5); // At least 5ms (conservative)
  });

  it('should handle multiple concurrent timers', () => {
    const logger = createLogger(true);

    logger?.time('operation-1');
    logger?.time('operation-2');
    logger?.time('operation-3');

    const elapsed1 = logger?.timeEnd('operation-1');
    const elapsed2 = logger?.timeEnd('operation-2');
    const elapsed3 = logger?.timeEnd('operation-3');

    expect(elapsed1).toBeGreaterThanOrEqual(0);
    expect(elapsed2).toBeGreaterThanOrEqual(0);
    expect(elapsed3).toBeGreaterThanOrEqual(0);
  });

  it('should throw error for missing timer label', () => {
    const logger = createLogger(true);
    expect(() => logger?.timeEnd('non-existent-timer')).toThrow();
  });

  it('should measure timing within reasonable accuracy', () => {
    const logger = createLogger(true);
    logger?.time('accuracy-test');

    const start = Date.now();
    while (Date.now() - start < 50) {
      // Wait ~50ms
    }

    const elapsed = logger?.timeEnd('accuracy-test');
    expect(elapsed).toBeGreaterThanOrEqual(45); // At least 45ms
    expect(elapsed).toBeLessThan(100); // Less than 100ms (reasonable threshold)
  });
});

describe('Logger - Memory Tracking', () => {
  it('should capture current memory usage in context', () => {
    const logger = createLogger(true);
    const stats = logger?.getStats();

    expect(stats?.memoryUsage).toBeDefined();
    expect(stats?.memoryUsage.currentUsage).toBeGreaterThan(0);
  });

  it('should track peak memory usage', () => {
    const logger = createLogger(true);

    logger?.info(LogCategory.FILE_PROCESSING, 'Initial log');
    const stats = logger?.getStats();

    expect(stats?.memoryUsage.peakUsage).toBeGreaterThan(0);
  });

  it('should update memory stats in getStats()', () => {
    const logger = createLogger(true);

    const stats1 = logger?.getStats();
    logger?.info(LogCategory.FILE_PROCESSING, 'Log message');
    const stats2 = logger?.getStats();

    expect(stats2?.memoryUsage.currentUsage).toBeGreaterThan(0);
    expect(stats2?.memoryUsage.peakUsage).toBeGreaterThanOrEqual(stats1?.memoryUsage.peakUsage || 0);
  });

  it('should include memory stats in LoggingStats interface', () => {
    const logger = createLogger(true);
    const stats = logger?.getStats();

    expect(stats).toBeDefined();
    expect(stats?.memoryUsage).toBeDefined();
    expect(typeof stats?.memoryUsage.peakUsage).toBe('number');
    expect(typeof stats?.memoryUsage.currentUsage).toBe('number');
  });
});
