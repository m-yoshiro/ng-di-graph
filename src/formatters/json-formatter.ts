import { LogCategory, type Logger } from '../core/logger';
import type { Graph } from '../types';

/**
 * JSON formatter for dependency graph output
 * Produces pretty-printed JSON with 2-space indentation
 */
export class JsonFormatter {
  /**
   * Logger instance for verbose output (optional)
   * @private
   */
  private readonly _logger?: Logger;

  /**
   * Create a new JSON formatter
   * @param logger Optional Logger instance for verbose mode
   */
  constructor(logger?: Logger) {
    this._logger = logger;
  }

  /**
   * Format a dependency graph as JSON
   * @param graph The dependency graph to format
   * @returns Pretty-printed JSON string
   */
  format(graph: Graph): string {
    this._logger?.time('json-format');
    this._logger?.info(LogCategory.PERFORMANCE, 'Generating JSON output', {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
    });

    const result = JSON.stringify(graph, null, 2);

    const elapsed = this._logger?.timeEnd('json-format') ?? 0;
    this._logger?.info(LogCategory.PERFORMANCE, 'JSON output complete', {
      outputSize: result.length,
      elapsed,
    });

    return result;
  }
}
