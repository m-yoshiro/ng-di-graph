import { LogCategory, type Logger } from '../core/logger';
import type { Graph, TextFormatContext } from '../types';

export class TextFormatter {
  private readonly _context: TextFormatContext;
  private readonly _logger?: Logger;

  constructor(context: TextFormatContext = {}, logger?: Logger) {
    this._context = context;
    this._logger = logger;
  }

  format(graph: Graph): string {
    this._logger?.time('text-format');
    this._logger?.info(LogCategory.PERFORMANCE, 'Generating text output', {
      nodeCount: graph.nodes.length,
      edgeCount: graph.edges.length,
    });

    const warningCount = this._context.warningCount ?? this._context.warnings?.length ?? 0;
    const circularDependencyCount = graph.circularDependencies.length;

    const lines: string[] = [];

    if (this._context.projectPath) {
      lines.push(`Project: ${this._context.projectPath}`);
    }

    if (this._context.direction) {
      const entry =
        this._context.entry && this._context.entry.length > 0
          ? this._context.entry.join(', ')
          : 'all';
      lines.push(`Scope: direction=${this._context.direction}, entry=${entry}`);
    }

    lines.push(
      `Files: ${this._context.processedFileCount ?? 0} (skipped: ${this._context.skippedFileCount ?? 0})`
    );

    if (warningCount > 0) {
      lines.push(`Warnings: ${warningCount}`);
    }

    if (circularDependencyCount > 0) {
      lines.push(`Circular dependencies: ${circularDependencyCount}`);
    }

    const dependencyGroups = this.getDependencyGroups(graph, 10);
    if (dependencyGroups.length > 0) {
      lines.push('');
      lines.push('Dependencies (A depends on B):');
      lines.push(...dependencyGroups);
    }

    const result = `${lines.join('\n')}\n`;

    const elapsed = this._logger?.timeEnd('text-format') ?? 0;
    this._logger?.info(LogCategory.PERFORMANCE, 'Text output complete', {
      outputSize: result.length,
      elapsed,
    });

    return result;
  }

  private getDependencyGroups(graph: Graph, limit: number): string[] {
    const uniqueEdges = new Map<string, { from: string; to: string }>();
    for (const edge of graph.edges) {
      const key = `${edge.from}->${edge.to}`;
      if (!uniqueEdges.has(key)) {
        uniqueEdges.set(key, { from: edge.from, to: edge.to });
      }
    }

    const sortedEdges = [...uniqueEdges.values()]
      .sort((a, b) => {
        const fromOrder = a.from.localeCompare(b.from);
        return fromOrder !== 0 ? fromOrder : a.to.localeCompare(b.to);
      })
      .slice(0, limit);

    const grouped = new Map<string, string[]>();
    for (const edge of sortedEdges) {
      const deps = grouped.get(edge.from);
      if (deps) {
        deps.push(edge.to);
      } else {
        grouped.set(edge.from, [edge.to]);
      }
    }

    const lines: string[] = [];
    const groups = [...grouped.entries()];
    for (let i = 0; i < groups.length; i++) {
      const [from, deps] = groups[i];
      lines.push(from);
      for (let depIndex = 0; depIndex < deps.length; depIndex++) {
        const dep = deps[depIndex];
        const prefix = depIndex === deps.length - 1 ? '└─' : '├─';
        lines.push(`${prefix} ${dep}`);
      }
      if (i < groups.length - 1) {
        lines.push('');
      }
    }

    return lines;
  }
}
