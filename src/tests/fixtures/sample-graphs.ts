/**
 * Sample Graph Fixtures
 * Provides reusable graph structures for testing
 */

import type { Graph, Node, Edge } from '../../types';

/**
 * Simple graph with minimal nodes and edges
 * Useful for basic filtering and traversal tests
 */
export function createSmallTestGraph(): Graph {
  const nodes: Node[] = [
    { id: 'ServiceA', kind: 'service' },
    { id: 'ServiceB', kind: 'service' },
    { id: 'ServiceC', kind: 'service' }
  ];

  const edges: Edge[] = [
    { from: 'ServiceA', to: 'ServiceB' },
    { from: 'ServiceB', to: 'ServiceC' }
  ];

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Complex graph with multiple paths and nodes
 * Includes components and services with varied dependency chains
 */
export function createComplexTestGraph(): Graph {
  const nodes: Node[] = [
    { id: 'AppComponent', kind: 'component' },
    { id: 'FeatureComponent', kind: 'component' },
    { id: 'ServiceA', kind: 'service' },
    { id: 'ServiceB', kind: 'service' },
    { id: 'ServiceC', kind: 'service' },
    { id: 'ServiceD', kind: 'service' },
    { id: 'ServiceE', kind: 'service' },
    { id: 'UtilityService', kind: 'service' },
    { id: 'HelperService', kind: 'service' },
    { id: 'StandaloneService', kind: 'service' }
  ];

  const edges: Edge[] = [
    { from: 'AppComponent', to: 'ServiceA' },
    { from: 'AppComponent', to: 'ServiceB' },
    { from: 'AppComponent', to: 'ServiceC' },
    { from: 'ServiceA', to: 'ServiceD' },
    { from: 'ServiceB', to: 'ServiceE' },
    { from: 'ServiceC', to: 'ServiceE' },
    { from: 'ServiceA', to: 'UtilityService' },
    { from: 'ServiceD', to: 'UtilityService' },
    { from: 'FeatureComponent', to: 'HelperService' },
    { from: 'HelperService', to: 'UtilityService' }
  ];

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Graph with isolated nodes (nodes without connections)
 * Useful for testing filtering edge cases
 */
export function createIsolatedNodesGraph(): Graph {
  const nodes: Node[] = [
    { id: 'ConnectedA', kind: 'service' },
    { id: 'ConnectedB', kind: 'service' },
    { id: 'IsolatedNode', kind: 'service' },
    { id: 'SingletonService', kind: 'service' }
  ];

  const edges: Edge[] = [
    { from: 'ConnectedA', to: 'ConnectedB' }
  ];

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Graph with circular dependencies
 * Tests circular dependency detection and handling
 */
export function createCycleTestGraph(): Graph {
  const nodes: Node[] = [
    { id: 'EntryNode', kind: 'service' },
    { id: 'CycleA', kind: 'service' },
    { id: 'CycleB', kind: 'service' },
    { id: 'CycleC', kind: 'service' }
  ];

  const edges: Edge[] = [
    { from: 'EntryNode', to: 'CycleA' },
    { from: 'CycleA', to: 'CycleB' },
    { from: 'CycleB', to: 'CycleC' },
    { from: 'CycleC', to: 'CycleA', isCircular: true } // Back edge creates cycle
  ];

  return {
    nodes,
    edges,
    circularDependencies: [['CycleA', 'CycleB', 'CycleC']]
  };
}

/**
 * Graph with bidirectional dependencies
 * Tests complex connectivity patterns
 */
export function createBidirectionalTestGraph(): Graph {
  const nodes: Node[] = [
    { id: 'TopService', kind: 'service' },
    { id: 'MiddleService', kind: 'service' },
    { id: 'LeftService', kind: 'service' },
    { id: 'RightService', kind: 'service' },
    { id: 'BottomService', kind: 'service' }
  ];

  const edges: Edge[] = [
    { from: 'TopService', to: 'MiddleService' },
    { from: 'MiddleService', to: 'LeftService' },
    { from: 'MiddleService', to: 'RightService' },
    { from: 'LeftService', to: 'BottomService' },
    { from: 'RightService', to: 'BottomService' },
    { from: 'BottomService', to: 'TopService' } // Creates complex connectivity
  ];

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Combined graph merging complex and isolated graphs
 * Tests handling of mixed graph structures
 */
export function createCombinedTestGraph(): Graph {
  const complexGraph = createComplexTestGraph();
  const isolatedGraph = createIsolatedNodesGraph();

  return {
    nodes: [...complexGraph.nodes, ...isolatedGraph.nodes],
    edges: [...complexGraph.edges, ...isolatedGraph.edges],
    circularDependencies: []
  };
}

/**
 * Graph with edge flags (@Optional, @Self, etc.)
 * Tests decorator flag handling
 */
export function createGraphWithEdgeFlags(): Graph {
  const nodes: Node[] = [
    { id: 'ServiceWithFlags', kind: 'service' },
    { id: 'OptionalDep', kind: 'service' },
    { id: 'RequiredDep', kind: 'service' }
  ];

  const edges: Edge[] = [
    {
      from: 'ServiceWithFlags',
      to: 'OptionalDep',
      flags: { optional: true }
    },
    {
      from: 'ServiceWithFlags',
      to: 'RequiredDep',
      flags: { self: true }
    }
  ];

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Generate medium-sized graph with specified node count
 * Useful for performance testing
 * @param nodeCount - Number of nodes to create
 */
export function createMediumTestGraph(nodeCount: number): Graph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({ id: `Node_${i}`, kind: 'service' });
  }

  // Create a connected graph with reasonable branching
  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push({ from: `Node_${i}`, to: `Node_${i + 1}` });

    // Add some branching for more realistic structure
    if (i % 5 === 0 && i + 5 < nodeCount) {
      edges.push({ from: `Node_${i}`, to: `Node_${i + 5}` });
    }
  }

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Generate large graph with complex structure
 * Tests performance and scalability
 * @param nodeCount - Number of nodes to create
 */
export function createLargeTestGraph(nodeCount: number): Graph {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({ id: `Node_${i}`, kind: 'service' });
  }

  // Create a more complex graph structure
  for (let i = 0; i < nodeCount; i++) {
    // Each node connects to next 2-3 nodes
    for (let j = 1; j <= 3 && i + j < nodeCount; j++) {
      edges.push({ from: `Node_${i}`, to: `Node_${i + j}` });
    }

    // Add some backward connections for cycles
    if (i > 10 && i % 20 === 0) {
      edges.push({ from: `Node_${i}`, to: `Node_${i - 10}` });
    }
  }

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Diamond dependency pattern
 * Classic dependency injection pattern for testing
 */
export function createDiamondDependencyGraph(): Graph {
  const nodes: Node[] = [
    { id: 'TopService', kind: 'service' },
    { id: 'LeftService', kind: 'service' },
    { id: 'RightService', kind: 'service' },
    { id: 'BottomService', kind: 'service' }
  ];

  const edges: Edge[] = [
    { from: 'TopService', to: 'LeftService' },
    { from: 'TopService', to: 'RightService' },
    { from: 'LeftService', to: 'BottomService' },
    { from: 'RightService', to: 'BottomService' }
  ];

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Graph with multiple disconnected components
 * Tests filtering and traversal across disconnected subgraphs
 */
export function createDisconnectedComponentsGraph(): Graph {
  const nodes: Node[] = [
    // Component 1
    { id: 'Component1A', kind: 'service' },
    { id: 'Component1B', kind: 'service' },
    { id: 'Component1C', kind: 'service' },
    // Component 2
    { id: 'Component2A', kind: 'service' },
    { id: 'Component2B', kind: 'service' },
    // Component 3 (isolated)
    { id: 'Component3', kind: 'service' }
  ];

  const edges: Edge[] = [
    // Component 1 connections
    { from: 'Component1A', to: 'Component1B' },
    { from: 'Component1B', to: 'Component1C' },
    // Component 2 connections
    { from: 'Component2A', to: 'Component2B' }
    // Component 3 has no connections
  ];

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Graph with self-referencing node
 * Tests edge case of node depending on itself
 */
export function createSelfReferencingGraph(): Graph {
  const nodes: Node[] = [
    { id: 'SelfRefService', kind: 'service' },
    { id: 'DependentService', kind: 'service' }
  ];

  const edges: Edge[] = [
    { from: 'SelfRefService', to: 'SelfRefService' }, // Self reference
    { from: 'SelfRefService', to: 'DependentService' }
  ];

  return {
    nodes,
    edges,
    circularDependencies: []
  };
}

/**
 * Empty graph with no nodes or edges
 * Tests handling of empty/null cases
 */
export function createEmptyGraph(): Graph {
  return {
    nodes: [],
    edges: [],
    circularDependencies: []
  };
}
