import type { Graph } from '../types';

/**
 * JSON formatter for dependency graph output
 * Produces pretty-printed JSON with 2-space indentation
 */
export class JsonFormatter {
  /**
   * Format a dependency graph as JSON
   * @param graph The dependency graph to format
   * @returns Pretty-printed JSON string
   */
  format(graph: Graph): string {
    return JSON.stringify(graph, null, 2);
  }
}
