/**
 * Graph builder module for ng-di-graph CLI tool
 * Transforms parsed classes into graph data structure
 */

import type { Edge, Graph, Node, NodeKind, ParsedClass } from '../types';

/**
 * Validates input parameters for the buildGraph function
 * @param parsedClasses Array to validate
 * @throws Error if validation fails
 */
function validateInput(parsedClasses: ParsedClass[]): void {
  // Check for null/undefined
  if (parsedClasses == null) {
    throw new Error('parsedClasses parameter cannot be null or undefined');
  }

  // Validate each ParsedClass
  for (let i = 0; i < parsedClasses.length; i++) {
    const parsedClass = parsedClasses[i];

    // Check name property
    if (typeof parsedClass.name !== 'string') {
      throw new Error('ParsedClass must have a valid name property');
    }

    if (parsedClass.name.trim() === '') {
      throw new Error('ParsedClass name cannot be empty');
    }

    // Check kind property
    if (typeof parsedClass.kind !== 'string') {
      throw new Error('ParsedClass must have a valid kind property');
    }

    // Check dependencies property
    if (parsedClass.dependencies == null) {
      throw new Error('ParsedClass must have a dependencies array');
    }

    if (!Array.isArray(parsedClass.dependencies)) {
      throw new Error('ParsedClass dependencies must be an array');
    }

    // Validate each dependency
    for (const dependency of parsedClass.dependencies) {
      if (typeof dependency.token !== 'string') {
        throw new Error('ParsedDependency must have a valid token property');
      }
    }
  }
}

/**
 * Detects circular dependencies using DFS (Depth-First Search)
 * @param edges Array of edges representing the dependency graph
 * @param nodes Array of nodes in the graph
 * @returns Array of circular dependency paths and edges marked as circular
 */
function detectCircularDependencies(
  edges: Edge[],
  nodes: Node[]
): {
  circularDependencies: string[][];
  circularEdges: Set<string>;
} {
  const circularDependencies: string[][] = [];
  const circularEdges = new Set<string>();

  // Build adjacency list for efficient traversal
  const adjacencyList = new Map<string, string[]>();
  for (const node of nodes) {
    adjacencyList.set(node.id, []);
  }
  for (const edge of edges) {
    if (!adjacencyList.has(edge.from)) {
      adjacencyList.set(edge.from, []);
    }
    const neighbors = adjacencyList.get(edge.from);
    if (neighbors) {
      neighbors.push(edge.to);
    }
  }

  // Track visited nodes during DFS
  const recursionStack = new Set<string>();
  const processedNodes = new Set<string>();

  /**
   * DFS helper function to detect cycles
   */
  function dfs(node: string, path: string[]): void {
    if (processedNodes.has(node)) {
      return; // Already processed this node completely
    }

    if (recursionStack.has(node)) {
      // Found a cycle - extract the cycle path
      const cycleStartIndex = path.indexOf(node);
      const cyclePath = [...path.slice(cycleStartIndex), node];
      circularDependencies.push(cyclePath);

      // Mark all edges in this cycle as circular
      for (let i = 0; i < cyclePath.length - 1; i++) {
        const edgeKey = `${cyclePath[i]}->${cyclePath[i + 1]}`;
        circularEdges.add(edgeKey);
      }
      return;
    }

    recursionStack.add(node);
    const newPath = [...path, node];

    const neighbors = adjacencyList.get(node) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, newPath);
    }

    recursionStack.delete(node);
    processedNodes.add(node);
  }

  // Run DFS from each unvisited node
  for (const node of nodes) {
    if (!processedNodes.has(node.id)) {
      dfs(node.id, []);
    }
  }

  return { circularDependencies, circularEdges };
}

/**
 * Builds a dependency graph from parsed Angular classes
 * @param parsedClasses Array of parsed classes with their dependencies
 * @returns Graph containing nodes and edges representing the dependency relationships
 */
export function buildGraph(parsedClasses: ParsedClass[]): Graph {
  // Validate input parameters
  validateInput(parsedClasses);

  // Use Map for O(1) lookups during construction
  const nodeMap = new Map<string, Node>();
  const edges: Edge[] = [];

  // First pass: Create nodes for all parsed classes
  for (const parsedClass of parsedClasses) {
    if (!nodeMap.has(parsedClass.name)) {
      nodeMap.set(parsedClass.name, {
        id: parsedClass.name,
        kind: parsedClass.kind,
      });
    }
  }

  // Second pass: Create edges and unknown nodes for dependencies
  for (const parsedClass of parsedClasses) {
    for (const dependency of parsedClass.dependencies) {
      // Create unknown node if dependency doesn't exist
      if (!nodeMap.has(dependency.token)) {
        nodeMap.set(dependency.token, {
          id: dependency.token,
          kind: 'unknown',
        });
      }

      // Create edge
      const edge: Edge = {
        from: parsedClass.name,
        to: dependency.token,
      };

      // Add flags if present
      if (dependency.flags) {
        edge.flags = dependency.flags;
      }

      edges.push(edge);
    }
  }

  // Convert map to array and sort for consistency
  const nodes = Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id));

  // Sort edges by from, then by to for consistency
  edges.sort((a, b) => {
    const fromCompare = a.from.localeCompare(b.from);
    if (fromCompare !== 0) return fromCompare;
    return a.to.localeCompare(b.to);
  });

  // Detect circular dependencies
  const { circularDependencies, circularEdges } = detectCircularDependencies(edges, nodes);

  // Mark circular edges
  for (const edge of edges) {
    const edgeKey = `${edge.from}->${edge.to}`;
    if (circularEdges.has(edgeKey)) {
      edge.isCircular = true;
    }
  }

  return {
    nodes,
    edges,
    circularDependencies,
  };
}
