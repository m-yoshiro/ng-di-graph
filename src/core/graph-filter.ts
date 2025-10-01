/**
 * Graph filtering module for ng-di-graph CLI tool
 * Filters graphs based on entry points and direction
 */

import type { CliOptions, Graph } from '../types';

/**
 * Helper function to validate entry points and perform traversal
 * @param entryPoints Array of entry point names to validate and traverse from
 * @param graph The graph containing all nodes
 * @param adjacencyList The adjacency list for traversal
 * @param resultSet The set to collect traversal results
 * @param options CLI options for verbose output
 */
function validateAndTraverseEntryPoints(
  entryPoints: string[],
  graph: Graph,
  adjacencyList: Map<string, string[]>,
  resultSet: Set<string>,
  options: CliOptions
): void {
  for (const entryPoint of entryPoints) {
    if (graph.nodes.some((n) => n.id === entryPoint)) {
      traverseFromEntry(entryPoint, adjacencyList, resultSet);
    } else if (options.verbose) {
      console.warn(`Entry point '${entryPoint}' not found in graph`);
    }
  }
}

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

  // Handle bidirectional separately by combining upstream and downstream
  if (options.direction === 'both') {
    // Perform upstream traversal
    const upstreamAdjacencyList = buildAdjacencyList(graph, 'upstream');
    const upstreamNodes = new Set<string>();
    validateAndTraverseEntryPoints(
      options.entry,
      graph,
      upstreamAdjacencyList,
      upstreamNodes,
      options
    );

    // Perform downstream traversal
    const downstreamAdjacencyList = buildAdjacencyList(graph, 'downstream');
    const downstreamNodes = new Set<string>();
    validateAndTraverseEntryPoints(
      options.entry,
      graph,
      downstreamAdjacencyList,
      downstreamNodes,
      options
    );

    // Combine upstream and downstream results using Set constructor for optimal performance
    const combinedNodes = new Set([...upstreamNodes, ...downstreamNodes]);
    for (const nodeId of combinedNodes) {
      includedNodeIds.add(nodeId);
    }
  } else {
    // Handle single direction (upstream or downstream)
    const adjacencyList = buildAdjacencyList(graph, options.direction);
    validateAndTraverseEntryPoints(options.entry, graph, adjacencyList, includedNodeIds, options);
  }

  // Filter nodes and edges
  const filteredNodes = graph.nodes.filter((node) => includedNodeIds.has(node.id));
  const filteredEdges = graph.edges.filter(
    (edge) => includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to)
  );

  // Filter circular dependencies - only include cycles where all nodes exist and edges form valid cycle
  const filteredCircularDeps = graph.circularDependencies.filter((cycle) => {
    // First check if cycle has valid length (minimum 2 for self-loop, minimum 3 for multi-node cycle)
    if (cycle.length < 2) {
      return false; // Invalid cycle - too short
    }

    // Check if it's a valid cycle format:
    // - Self-loop: ['A', 'A']
    // - Proper cycle with closing node: ['A', 'B', 'A']
    // - Proper cycle without closing node: ['A', 'B', 'C'] (where edges form A->B->C->A)
    const isSelfLoop = cycle.length === 2 && cycle[0] === cycle[1];
    const isProperCycleWithClosing = cycle.length >= 3 && cycle[0] === cycle[cycle.length - 1];
    const isProperCycleWithoutClosing = cycle.length >= 3 && cycle[0] !== cycle[cycle.length - 1];

    if (!isSelfLoop && !isProperCycleWithClosing && !isProperCycleWithoutClosing) {
      return false; // Invalid cycle format
    }

    // Check all nodes in cycle exist in filtered result
    if (!cycle.every((nodeId) => includedNodeIds.has(nodeId))) {
      return false;
    }

    // Then check that the cycle has valid edges between consecutive nodes in the ORIGINAL graph
    const edgesToCheck = isProperCycleWithClosing ? cycle.length - 1 : cycle.length;

    for (let i = 0; i < edgesToCheck; i++) {
      const fromNode = cycle[i];
      const toNode = isProperCycleWithClosing ? cycle[i + 1] : cycle[(i + 1) % cycle.length];

      // Check if there's an edge from fromNode to toNode in the original graph edges
      const hasEdgeInOriginal = graph.edges.some(
        (edge) => edge.from === fromNode && edge.to === toNode
      );
      if (!hasEdgeInOriginal) {
        return false; // Invalid cycle - missing edge in original graph
      }
    }

    return true;
  });

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
    if (direction === 'downstream') {
      const neighbors = adjacencyList.get(edge.from) || [];
      neighbors.push(edge.to);
      adjacencyList.set(edge.from, neighbors);
    } else if (direction === 'upstream') {
      const neighbors = adjacencyList.get(edge.to) || [];
      neighbors.push(edge.from);
      adjacencyList.set(edge.to, neighbors);
    }
  }

  return adjacencyList;
}
