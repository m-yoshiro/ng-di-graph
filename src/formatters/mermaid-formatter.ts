import { LogCategory, type Logger } from '../core/logger';
import type { Graph } from '../types';

/**
 * Mermaid formatter for dependency graph output
 * Produces flowchart LR syntax compatible with Mermaid Live Editor
 */
export class MermaidFormatter {
  /**
   * Logger instance for verbose output (optional)
   * @private
   */
  private readonly _logger?: Logger;

  /**
   * Create a new Mermaid formatter
   * @param logger Optional Logger instance for verbose mode
   */
  constructor(logger?: Logger) {
    this._logger = logger;
  }

  /**
   * Format a dependency graph as Mermaid flowchart
   * @param graph The dependency graph to format
   * @returns Mermaid flowchart string
   */
  format(graph: Graph): string {
    this._logger?.time('mermaid-format');
    this._logger?.info(LogCategory.PERFORMANCE, 'Generating Mermaid output', {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
    });
    if (graph.nodes.length === 0) {
      const result = 'flowchart LR\n  %% Empty graph - no nodes to display';
      const elapsed = this._logger?.timeEnd('mermaid-format') ?? 0;
      this._logger?.info(LogCategory.PERFORMANCE, 'Mermaid output complete', {
        outputSize: result.length,
        elapsed,
      });
      return result;
    }

    const lines = ['flowchart LR'];

    // Add edges with proper formatting
    for (const edge of graph.edges) {
      const fromNode = this.sanitizeNodeName(edge.from);
      const toNode = this.sanitizeNodeName(edge.to);

      if (edge.isCircular) {
        lines.push(`  ${fromNode} -.->|circular| ${toNode}`);
      } else {
        lines.push(`  ${fromNode} --> ${toNode}`);
      }
    }

    // Add circular dependency comments if any
    if (graph.circularDependencies.length > 0) {
      lines.push('');
      lines.push('  %% Circular Dependencies Detected:');
      for (const cycle of graph.circularDependencies) {
        lines.push(`  %% ${cycle.join(' -> ')} -> ${cycle[0]}`);
      }
    }

    const result = lines.join('\n');

    const elapsed = this._logger?.timeEnd('mermaid-format') ?? 0;
    this._logger?.info(LogCategory.PERFORMANCE, 'Mermaid output complete', {
      outputSize: result.length,
      elapsed,
    });

    return result;
  }

  /**
   * Sanitize node names for Mermaid compatibility
   * Replaces special characters that break Mermaid syntax
   * @param nodeName The original node name
   * @returns Sanitized node name
   */
  private sanitizeNodeName(nodeName: string): string {
    // Replace special characters that break Mermaid syntax
    return nodeName.replace(/[.-]/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
  }
}
