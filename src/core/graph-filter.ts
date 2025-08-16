/**
 * Graph filtering module for ng-di-graph CLI tool
 * Filters graphs based on entry points and direction
 */

import type { CliOptions, Graph } from '../types';

/**
 * Filters a graph based on entry points and traversal direction
 * @param graph The graph to filter
 * @param options CLI options containing entry points and direction
 * @returns Filtered graph containing only nodes reachable from entry points
 */
export function filterGraph(graph: Graph, options: CliOptions): Graph {
  // If no entry points specified or empty array, return original graph
  if (!options.entry || options.entry.length === 0) {
    return graph;
  }

  const includedNodeIds = new Set<string>();
  const adjacencyList = buildAdjacencyList(graph, options.direction);

  // Perform DFS from each entry point
  for (const entryPoint of options.entry) {
    if (graph.nodes.some((n) => n.id === entryPoint)) {
      traverseFromEntry(entryPoint, adjacencyList, includedNodeIds);
    } else if (options.verbose) {
      console.warn(`Entry point '${entryPoint}' not found in graph`);
    }
  }

  // Filter nodes and edges
  const filteredNodes = graph.nodes.filter((node) => includedNodeIds.has(node.id));
  const filteredEdges = graph.edges.filter(
    (edge) => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to)
  );

  // Filter circular dependencies
  const filteredCircularDeps = graph.circularDependencies.filter((cycle) =>
    cycle.every((nodeId) => includedNodeIds.has(nodeId))
  );

  if (options.verbose) {
    console.log(`Filtered graph: ${filteredNodes.length} nodes, ${filteredEdges.length} edges`);
    console.log(`Entry points: ${options.entry.join(', ')}`);
  }

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
    circularDependencies: filteredCircularDeps,
  };
}

/**
 * Traverses the graph from a starting node using DFS
 * @param startNode The node to start traversal from
 * @param adjacencyList The adjacency list representation of the graph
 * @param visited Set to track visited nodes
 */
function traverseFromEntry(
  startNode: string,
  adjacencyList: Map<string, string[]>,
  visited: Set<string>
): void {
  const stack = [startNode];

  while (stack.length > 0) {
    const currentNode = stack.pop();
    if (!currentNode) break; // Defensive check, should never happen

    if (visited.has(currentNode)) {
      continue;
    }

    visited.add(currentNode);

    // Add neighbors to stack for traversal
    const neighbors = adjacencyList.get(currentNode) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }
}

/**
 * Builds an adjacency list from the graph based on direction
 * @param graph The graph to build adjacency list from
 * @param direction The direction to follow edges
 * @returns Map representing adjacency list
 */
function buildAdjacencyList(graph: Graph, direction: string): Map<string, string[]> {
  const adjacencyList = new Map<string, string[]>();

  // Initialize empty arrays for all nodes
  for (const node of graph.nodes) {
    adjacencyList.set(node.id, []);
  }

  // Populate from edges based on direction
  for (const edge of graph.edges) {
    if (direction === 'downstream' || direction === 'both') {
      const neighbors = adjacencyList.get(edge.from) || [];
      neighbors.push(edge.to);
      adjacencyList.set(edge.from, neighbors);
    }

    if (direction === 'upstream' || direction === 'both') {
      const neighbors = adjacencyList.get(edge.to) || [];
      neighbors.push(edge.from);
      adjacencyList.set(edge.to, neighbors);
    }
  }

  return adjacencyList;
}
