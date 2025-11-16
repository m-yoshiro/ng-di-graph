/**
 * End-to-End Integration Tests for Verbose Mode
 * Tests the complete verbose mode workflow with Logger propagation
 */
import { describe, it, expect, beforeEach } from 'bun:test';
import { AngularParser } from '../core/parser';
import { buildGraph } from '../core/graph-builder';
import { JsonFormatter } from '../formatters/json-formatter';
import { MermaidFormatter } from '../formatters/mermaid-formatter';
import { LogCategory, type Logger } from '../core/logger';
import type { CliOptions } from '../types';
import {
  createStubLogger,
  createTestCliOptions,
  createTestLogger,
  mockConsole,
} from './helpers/test-utils';

describe('Verbose Mode - E2E Tests', () => {
  let cliOptions: CliOptions;

  beforeEach(() => {
    cliOptions = createTestCliOptions({
      verbose: false,
      includeDecorators: false,
    });
  });

  describe('Logger Creation and Propagation', () => {
    it('should create Logger when verbose is true', () => {
      const logger = createTestLogger(true);
      expect(logger).toBeDefined();
      expect(typeof logger?.info).toBe('function');
      expect(typeof logger?.debug).toBe('function');
      expect(typeof logger?.warn).toBe('function');
      expect(typeof logger?.error).toBe('function');
      expect(typeof logger?.time).toBe('function');
      expect(typeof logger?.timeEnd).toBe('function');
      expect(typeof logger?.getStats).toBe('function');
    });

    it('should return undefined when verbose is false', () => {
      const logger = createTestLogger(false);
      expect(logger).toBeUndefined();
    });

    it('should propagate Logger to AngularParser', () => {
      const logger = createTestLogger(true) as Logger;
      const parser = new AngularParser(cliOptions, logger);

      expect(parser).toBeDefined();
      // Parser should accept logger without errors
    });

    it('should propagate Logger to buildGraph', async () => {
      const logger = createTestLogger(true) as Logger;
      const parser = new AngularParser(cliOptions, logger);
      parser.loadProject();

      const parsedClasses = await parser.findDecoratedClasses();
      const graph = buildGraph(parsedClasses, logger);

      expect(graph).toBeDefined();
      expect(graph.nodes.length).toBeGreaterThan(0);
    });

    it('should propagate Logger to formatters', () => {
      const logger = createTestLogger(true) as Logger;
      const jsonFormatter = new JsonFormatter(logger);
      const mermaidFormatter = new MermaidFormatter(logger);

      expect(jsonFormatter).toBeDefined();
      expect(mermaidFormatter).toBeDefined();
    });
  });

  describe('Complete Verbose Workflow', () => {
    it('should execute complete pipeline with verbose logging', async () => {
      const verboseOptions: CliOptions = {
        ...cliOptions,
        verbose: true,
      };

      const logger = createTestLogger(verboseOptions.verbose) as Logger;
      expect(logger).toBeDefined();

      // Start timing
      logger.time('test-pipeline');

      // 1. Parse classes with logger
      const parser = new AngularParser(verboseOptions, logger);
      parser.loadProject();
      const parsedClasses = await parser.findDecoratedClasses();

      expect(parsedClasses.length).toBeGreaterThan(0);

      // 2. Build graph with logger
      const graph = buildGraph(parsedClasses, logger);

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      // 3. Format output with logger
      const formatter = new JsonFormatter(logger);
      const output = formatter.format(graph);

      expect(output).toBeDefined();
      expect(() => JSON.parse(output)).not.toThrow();

      // 4. Verify statistics
      const elapsed = logger.timeEnd('test-pipeline');
      const stats = logger.getStats();

      expect(elapsed).toBeGreaterThan(0);
      expect(stats.totalLogs).toBeGreaterThan(0);
      expect(stats.memoryUsage.peakUsage).toBeGreaterThan(0);
      expect(stats.memoryUsage.currentUsage).toBeGreaterThan(0);
    });

    it('should execute complete pipeline without Logger (backward compatibility)', async () => {
      const nonVerboseOptions: CliOptions = {
        ...cliOptions,
        verbose: false,
      };

      const logger = createTestLogger(nonVerboseOptions.verbose);
      expect(logger).toBeUndefined();

      // Parser without logger
      const parser = new AngularParser(nonVerboseOptions);
      parser.loadProject();
      const parsedClasses = await parser.findDecoratedClasses();

      expect(parsedClasses.length).toBeGreaterThan(0);

      // Build graph without logger
      const graph = buildGraph(parsedClasses);

      expect(graph.nodes.length).toBeGreaterThan(0);

      // Format without logger
      const formatter = new JsonFormatter();
      const output = formatter.format(graph);

      expect(output).toBeDefined();
      expect(() => JSON.parse(output)).not.toThrow();
    });

    it('should work with Mermaid format and verbose mode', async () => {
      const verboseOptions: CliOptions = {
        ...cliOptions,
        verbose: true,
        format: 'mermaid',
      };

      const logger = createTestLogger(verboseOptions.verbose) as Logger;

      // Parse and build
      const parser = new AngularParser(verboseOptions, logger);
      parser.loadProject();
      const parsedClasses = await parser.findDecoratedClasses();
      const graph = buildGraph(parsedClasses, logger);

      // Format as Mermaid
      const formatter = new MermaidFormatter(logger);
      const output = formatter.format(graph);

      expect(output).toContain('flowchart LR');
      expect(output.length).toBeGreaterThan(0);

      // Verify stats
      const stats = logger.getStats();
      expect(stats.totalLogs).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should track performance timing accurately', () => {
      const logger = createTestLogger(true) as Logger;

      logger.time('operation1');
      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 5) {
        // Wait ~5ms
      }
      const elapsed1 = logger.timeEnd('operation1');

      expect(elapsed1).toBeGreaterThan(4); // Should be at least 4ms
      expect(elapsed1).toBeLessThan(50); // Should be less than 50ms (reasonable upper bound)
    });

    it('should track memory usage', () => {
      const logger = createTestLogger(true) as Logger;

      // Generate some logs
      for (let i = 0; i < 10; i++) {
        logger.info('performance', `Test log ${i}`);
      }

      const stats = logger.getStats();

      expect(stats.memoryUsage.peakUsage).toBeGreaterThan(0);
      expect(stats.memoryUsage.currentUsage).toBeGreaterThan(0);
      expect(stats.memoryUsage.peakUsage).toBeGreaterThanOrEqual(stats.memoryUsage.currentUsage);
    });

    it('should aggregate statistics correctly', () => {
      const logger = createTestLogger(true) as Logger;

      // Generate various log types
      logger.info('file-processing', 'Processing file 1');
      logger.info('file-processing', 'Processing file 2');
      logger.debug('ast-analysis', 'Analyzing AST');
      logger.warn('error-recovery', 'Recovering from error');

      const stats = logger.getStats();

      expect(stats.totalLogs).toBe(4);
      expect(stats.categoryCounts['file-processing']).toBe(2);
      expect(stats.categoryCounts['ast-analysis']).toBe(1);
      expect(stats.categoryCounts['error-recovery']).toBe(1);
    });
  });

  describe('Verbose Instrumentation Validation', () => {
    it('should record instrumentation data without relying on wall-clock variance', async () => {
      const verboseOptions: CliOptions = {
        ...cliOptions,
        verbose: true,
      };
      const stubLogger = createStubLogger();
      const consoleMock = mockConsole();

      try {
        const parser = new AngularParser(verboseOptions, stubLogger);
        parser.loadProject();
        const parsedClasses = await parser.findDecoratedClasses();

        expect(parsedClasses.length).toBeGreaterThan(0);

        const graph = buildGraph(parsedClasses, stubLogger);
        expect(graph.nodes.length).toBeGreaterThan(0);
        expect(graph.edges.length).toBeGreaterThan(0);

        const formatter = new JsonFormatter(stubLogger);
        const output = formatter.format(graph);

        expect(() => JSON.parse(output)).not.toThrow();
      } finally {
        consoleMock.restore();
      }

      expect(stubLogger.logs.length).toBeGreaterThan(0);

      const stats = stubLogger.getStats();
      expect(stats.totalLogs).toBe(stubLogger.logs.length);

      const categoryCounts = stats.categoryCounts;
      expect((categoryCounts[LogCategory.FILE_PROCESSING] ?? 0)).toBeGreaterThan(0);
      expect((categoryCounts[LogCategory.AST_ANALYSIS] ?? 0)).toBeGreaterThan(0);
      expect((categoryCounts[LogCategory.GRAPH_CONSTRUCTION] ?? 0)).toBeGreaterThan(0);
      expect((categoryCounts[LogCategory.PERFORMANCE] ?? 0)).toBeGreaterThan(0);

      const timerLabels = stubLogger.getCompletedTimerLabels();
      expect(timerLabels).toEqual(
        expect.arrayContaining([
          'findDecoratedClasses',
          'buildGraph',
          'circularDetection',
          'json-format',
        ])
      );

      const buildGraphDuration = stubLogger.getTimerDuration('buildGraph');
      expect(buildGraphDuration).toBeDefined();
      expect((buildGraphDuration ?? 0)).toBeGreaterThan(0);
    });
  });

  describe('Logger Integration Completeness', () => {
    it('should collect comprehensive statistics from all components', async () => {
      const logger = createTestLogger(true) as Logger;

      const verboseOptions: CliOptions = {
        ...cliOptions,
        verbose: true,
      };

      // Run complete pipeline
      const parser = new AngularParser(verboseOptions, logger);
      parser.loadProject();
      const parsedClasses = await parser.findDecoratedClasses();
      const graph = buildGraph(parsedClasses, logger);
      const formatter = new JsonFormatter(logger);
      formatter.format(graph);

      const stats = logger.getStats();

      // Should have logs from multiple categories
      const categoryCount = Object.keys(stats.categoryCounts).length;
      expect(categoryCount).toBeGreaterThan(0);

      // Should have collected performance metrics
      expect(stats.memoryUsage.peakUsage).toBeGreaterThan(0);
      expect(stats.totalLogs).toBeGreaterThan(0);
    });
  });
});
