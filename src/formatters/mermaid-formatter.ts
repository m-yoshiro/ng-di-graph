import type { Graph } from '../types';

/**
 * Mermaid formatter for dependency graph output
 * Produces flowchart LR syntax compatible with Mermaid Live Editor
 */
export class MermaidFormatter {
  /**
   * Format a dependency graph as Mermaid flowchart
   * @param graph The dependency graph to format
   * @returns Mermaid flowchart string
   */
  format(graph: Graph): string {
    if (graph.nodes.length === 0) {
      return 'flowchart LR\n  %% Empty graph - no nodes to display';
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

    return lines.join('\n');
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
