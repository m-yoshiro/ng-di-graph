/**
 * Test suite for Graph Builder Logger Integration (Task 5.1 - Phase 2, Task 2.2)
 * Following TDD methodology - RED phase (failing tests first)
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { buildGraph } from '../core/graph-builder';
import { createLogger, type Logger } from '../core/logger';
import type { ParsedClass } from '../types';

describe('Graph Builder - Logger Integration', () => {
  let logger: Logger | undefined;
  let errorOutput: string[];
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    errorOutput = [];
    originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      errorOutput.push(args.map(arg => String(arg)).join(' '));
    };
    logger = createLogger(true); // verbose = true
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe('buildGraph with Logger', () => {
    it('should log graph construction start', () => {
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ServiceA',
          kind: 'service',
          dependencies: []
        }
      ];

      buildGraph(parsedClasses, logger);

      const hasStartLog = errorOutput.some(log =>
        log.includes('graph-construction') && log.includes('Starting')
      );
      expect(hasStartLog).toBe(true);
    });

    it('should log graph construction completion', () => {
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ServiceA',
          kind: 'service',
          dependencies: []
        }
      ];

      buildGraph(parsedClasses, logger);

      const hasCompleteLog = errorOutput.some(log =>
        log.includes('graph-construction') && log.includes('complete')
      );
      expect(hasCompleteLog).toBe(true);
    });

    it('should log node creation statistics', () => {
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ServiceA',
          kind: 'service',
          dependencies: []
        },
        {
          name: 'ServiceB',
          kind: 'service',
          dependencies: []
        }
      ];

      buildGraph(parsedClasses, logger);

      const hasNodeLog = errorOutput.some(log =>
        log.includes('node') && log.includes('2')
      );
      expect(hasNodeLog).toBe(true);
    });

    it('should log edge creation statistics', () => {
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ServiceA',
          kind: 'service',
          dependencies: [{ token: 'ServiceB', flags: {} }]
        },
        {
          name: 'ServiceB',
          kind: 'service',
          dependencies: []
        }
      ];

      buildGraph(parsedClasses, logger);

      const hasEdgeLog = errorOutput.some(log =>
        log.includes('edge')
      );
      expect(hasEdgeLog).toBe(true);
    });

    it('should log circular dependency detection', () => {
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ServiceA',
          kind: 'service',
          dependencies: [{ token: 'ServiceB', flags: {} }]
        },
        {
          name: 'ServiceB',
          kind: 'service',
          dependencies: [{ token: 'ServiceA', flags: {} }]
        }
      ];

      buildGraph(parsedClasses, logger);

      const hasCircularLog = errorOutput.some(log =>
        log.includes('circular') || log.includes('Circular')
      );
      expect(hasCircularLog).toBe(true);
    });

    it('should log performance timing', () => {
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ServiceA',
          kind: 'service',
          dependencies: []
        }
      ];

      buildGraph(parsedClasses, logger);

      const hasTimingLog = errorOutput.some(log =>
        log.includes('duration') || log.includes('time')
      );
      expect(hasTimingLog).toBe(true);
    });

    it('should work without logger (backward compatibility)', () => {
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ServiceA',
          kind: 'service',
          dependencies: []
        }
      ];

      expect(() => buildGraph(parsedClasses)).not.toThrow();

      const graph = buildGraph(parsedClasses);
      expect(graph.nodes).toHaveLength(1);
      expect(graph.edges).toHaveLength(0);
    });

    it('should log unknown node creation', () => {
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ServiceA',
          kind: 'service',
          dependencies: [{ token: 'UnknownService', flags: {} }]
        }
      ];

      buildGraph(parsedClasses, logger);

      const hasUnknownLog = errorOutput.some(log =>
        log.includes('unknown') && log.includes('UnknownService')
      );
      expect(hasUnknownLog).toBe(true);
    });
  });
});
