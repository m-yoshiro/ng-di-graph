import { describe, it, expect, beforeEach } from 'bun:test';
import { filterGraph } from '../core/graph-filter';
import type { Graph, Node, Edge, CliOptions } from '../types';

describe('TDD Phase 1: Comprehensive Bidirectional Filtering Tests (RED PHASE)', () => {
  let complexTestGraph: Graph;
  let smallTestGraph: Graph;
  let isolatedNodesGraph: Graph;
  let cycleTestGraph: Graph;

  beforeEach(() => {
    // Create complex test graph with multiple paths and cycles
    complexTestGraph = createComplexTestGraph();

    // Create simple test graph for basic scenarios
    smallTestGraph = createSmallTestGraph();

    // Create graph with isolated nodes
    isolatedNodesGraph = createIsolatedNodesGraph();

    // Create graph with complex cycles
    cycleTestGraph = createCycleTestGraph();
  });

  describe('Downstream Filtering (Existing)', () => {
    it('should filter downstream dependencies correctly from single entry', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['AppComponent'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      expect(result.nodes.length).toBe(7); // AppComponent + 6 downstream nodes
      expect(result.edges.length).toBe(8); // All downstream edges

      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual([
        'AppComponent', 'ServiceA', 'ServiceB', 'ServiceC',
        'ServiceD', 'ServiceE', 'UtilityService'
      ].sort());
    });

    it('should filter downstream dependencies from multiple entries', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['AppComponent', 'FeatureComponent'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      expect(result.nodes.length).toBe(9); // Both trees combined
      expect(result.edges.length).toBe(10);
    });

    it('should handle empty entry points by returning full graph', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: [],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      expect(result).toEqual(complexTestGraph);
    });

    it('should handle non-existent entry points gracefully', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['NonExistentService'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: true
      };

      const result = filterGraph(complexTestGraph, options);

      expect(result.nodes.length).toBe(0);
      expect(result.edges.length).toBe(0);
    });
  });

  describe('Upstream Filtering (NEW)', () => {
    it('should filter upstream dependencies correctly from single entry', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['ServiceE'],
        direction: 'upstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      // ServiceE should trace back to ServiceB and ServiceC, then to AppComponent
      expect(result.nodes.length).toBe(4); // ServiceE, ServiceB, ServiceC, AppComponent
      expect(result.edges.length).toBe(4); // AppComponent->ServiceB, AppComponent->ServiceC, ServiceB->ServiceE, ServiceC->ServiceE

      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['AppComponent', 'ServiceB', 'ServiceC', 'ServiceE'].sort());
    });

    it('should filter upstream dependencies from multiple entries', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['ServiceD', 'ServiceE'],
        direction: 'upstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      // Both ServiceD and ServiceE trace back through different paths
      expect(result.nodes.length).toBe(6); // AppComponent, ServiceA, ServiceB, ServiceC, ServiceD, ServiceE
      expect(result.edges.length).toBe(6); // All edges between these nodes
    });

    it('should handle leaf nodes with no upstream dependencies', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['AppComponent'],
        direction: 'upstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      // AppComponent has no upstream dependencies in our test graph
      expect(result.nodes.length).toBe(1);
      expect(result.edges.length).toBe(0);
      expect(result.nodes[0].id).toBe('AppComponent');
    });

    it('should handle cycles in upstream traversal', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['CycleB'],
        direction: 'upstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(cycleTestGraph, options);

      // Should include all nodes in the cycle plus upstream dependencies
      expect(result.nodes.length).toBe(4); // EntryNode, CycleA, CycleB, CycleC
      expect(result.edges.length).toBe(4);

      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['EntryNode', 'CycleA', 'CycleB', 'CycleC'].sort());
    });
  });

  describe('Bidirectional Filtering (NEW)', () => {
    it('should filter both upstream and downstream from single entry', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['ServiceB'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      // ServiceB connects upstream to AppComponent and downstream to ServiceE
      expect(result.nodes.length).toBe(3); // AppComponent, ServiceB, ServiceE
      expect(result.edges.length).toBe(2);

      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['AppComponent', 'ServiceB', 'ServiceE'].sort());
    });

    it('should filter both directions from multiple entries', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['ServiceB', 'ServiceC'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      // Both ServiceB and ServiceC connect to AppComponent upstream and ServiceE downstream
      expect(result.nodes.length).toBe(4); // AppComponent, ServiceB, ServiceC, ServiceE
      expect(result.edges.length).toBe(4); // AppComponent->ServiceB, AppComponent->ServiceC, ServiceB->ServiceE, ServiceC->ServiceE
    });

    it('should handle complex bidirectional networks', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['MiddleService'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const graph = createBidirectionalTestGraph();
      const result = filterGraph(graph, options);

      // MiddleService should connect to all nodes in the bidirectional network
      expect(result.nodes.length).toBe(5); // All nodes in the network
      expect(result.edges.length).toBe(6); // All edges preserved
    });

    it('should handle cycles in bidirectional traversal', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['CycleB'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(cycleTestGraph, options);

      // Should include entire cycle plus any connected nodes
      expect(result.nodes.length).toBe(4); // CycleA, CycleB, CycleC, EntryNode
      expect(result.edges.length).toBe(4);

      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['CycleA', 'CycleB', 'CycleC', 'EntryNode'].sort());
    });
  });

  describe('Edge Case Handling', () => {
    it('should preserve circular dependency information after filtering', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['CycleA'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(cycleTestGraph, options);

      expect(result.circularDependencies.length).toBe(1);
      expect(result.circularDependencies[0]).toEqual(['CycleA', 'CycleB', 'CycleC']);

      // Circular edges should be marked
      const circularEdges = result.edges.filter(e => e.isCircular);
      expect(circularEdges.length).toBe(1); // The back edge
    });

    it('should handle isolated nodes correctly', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['IsolatedNode'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(isolatedNodesGraph, options);

      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].id).toBe('IsolatedNode');
      expect(result.edges.length).toBe(0);
    });

    it('should handle entry points with no connections', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['SingletonService'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(isolatedNodesGraph, options);

      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].id).toBe('SingletonService');
      expect(result.edges.length).toBe(0);
    });

    it('should handle mixed connected and isolated entry points', () => {
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['AppComponent', 'IsolatedNode'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const combinedGraph = createCombinedTestGraph();
      const result = filterGraph(combinedGraph, options);

      // Should include AppComponent tree plus isolated node
      expect(result.nodes.length).toBe(8); // 7 from AppComponent tree + 1 isolated
      expect(result.edges.length).toBe(8); // Only from connected component
    });

    it('should maintain edge flags during filtering when includeDecorators is true', () => {
      const graphWithFlags = createGraphWithEdgeFlags();
      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['ServiceWithFlags'],
        direction: 'downstream',
        includeDecorators: true,
        verbose: false
      };

      const result = filterGraph(graphWithFlags, options);

      const edgesWithFlags = result.edges.filter(e => e.flags && Object.keys(e.flags).length > 0);
      expect(edgesWithFlags.length).toBeGreaterThan(0);

      const optionalEdge = result.edges.find(e => e.flags?.optional);
      expect(optionalEdge).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle small graphs efficiently', () => {
      const startTime = performance.now();

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['ServiceA'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(smallTestGraph, options);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(10); // <10ms for small graphs
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('should handle medium graphs within performance requirements', () => {
      const mediumGraph = createMediumTestGraph(100); // 100 nodes
      const startTime = performance.now();

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['Node_0'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(mediumGraph, options);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(100); // <100ms for <500 nodes (requirement from plan)
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('should handle large graphs within performance requirements', () => {
      const largeGraph = createLargeTestGraph(500); // 500 nodes
      const startTime = performance.now();

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['Node_0', 'Node_250'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(largeGraph, options);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(executionTime).toBeLessThan(1000); // <1000ms for <5000 nodes
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('should have linear performance characteristics', () => {
      const sizes = [50, 100, 200];
      const times: number[] = [];

      for (const size of sizes) {
        const graph = createLargeTestGraph(size);
        const startTime = performance.now();

        const options: CliOptions = {
          project: './test',
          format: 'json',
          entry: ['Node_0'],
          direction: 'both',
          includeDecorators: false,
          verbose: false
        };

        filterGraph(graph, options);

        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      // Performance should scale roughly linearly
      const ratio1 = times[1] / times[0];
      const ratio2 = times[2] / times[1];

      // Allow for some variance but should be roughly 2x for 2x nodes
      expect(ratio1).toBeLessThan(5);
      expect(ratio2).toBeLessThan(3);
    });

    it('should measure memory usage during large graph processing', () => {
      const initialMemory = process.memoryUsage();
      const largeGraph = createLargeTestGraph(1000);

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['Node_0'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(largeGraph, options);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory usage should be reasonable (less than 100MB for 1000 nodes)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
      expect(result.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('Verbose Mode Tests', () => {
    it('should provide detailed output in verbose mode for downstream filtering', () => {
      // Mock console to capture verbose output
      const consoleLogs: string[] = [];
      const originalLog = console.log;
      const originalWarn = console.warn;

      console.log = (msg: string) => consoleLogs.push(msg);
      console.warn = (msg: string) => consoleLogs.push(`WARN: ${msg}`);

      try {
        const options: CliOptions = {
          project: './test',
          format: 'json',
          entry: ['AppComponent'],
          direction: 'downstream',
          includeDecorators: false,
          verbose: true
        };

        filterGraph(complexTestGraph, options);

        expect(consoleLogs.length).toBeGreaterThan(0);
        expect(consoleLogs.some(log => log.includes('Filtered graph:'))).toBe(true);
        expect(consoleLogs.some(log => log.includes('Entry points:'))).toBe(true);
      } finally {
        console.log = originalLog;
        console.warn = originalWarn;
      }
    });

    it('should warn about non-existent entry points in verbose mode', () => {
      const consoleLogs: string[] = [];
      const originalWarn = console.warn;

      console.warn = (msg: string) => consoleLogs.push(msg);

      try {
        const options: CliOptions = {
          project: './test',
          format: 'json',
          entry: ['NonExistentService'],
          direction: 'downstream',
          includeDecorators: false,
          verbose: true
        };

        filterGraph(complexTestGraph, options);

        expect(consoleLogs.some(log => log.includes("Entry point 'NonExistentService' not found"))).toBe(true);
      } finally {
        console.warn = originalWarn;
      }
    });
  });

  describe('Direction Validation Tests', () => {
    it('should handle invalid direction gracefully', () => {
      const options = {
        project: './test',
        format: 'json' as const,
        entry: ['AppComponent'],
        direction: 'invalid' as any, // Force invalid direction
        includeDecorators: false,
        verbose: false
      };

      // Current implementation treats invalid direction as no filtering
      const result = filterGraph(complexTestGraph, options);

      // Should return nodes based on entries but may not follow expected direction logic
      expect(result.nodes.length).toBeGreaterThan(0);
    });

    it('should handle undefined direction by defaulting to downstream', () => {
      const options = {
        project: './test',
        format: 'json' as const,
        entry: ['AppComponent'],
        direction: undefined as any,
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(complexTestGraph, options);

      // Should work like downstream filtering
      expect(result.nodes.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Graph Scenarios', () => {
    it('should handle diamond dependency patterns in all directions', () => {
      const diamondGraph = createDiamondDependencyGraph();

      // Test downstream from top
      let options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['TopService'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      let result = filterGraph(diamondGraph, options);
      expect(result.nodes.length).toBe(4); // All nodes in diamond

      // Test upstream from bottom
      options.entry = ['BottomService'];
      options.direction = 'upstream';

      result = filterGraph(diamondGraph, options);
      expect(result.nodes.length).toBe(4); // All nodes in diamond

      // Test bidirectional from middle
      options.entry = ['LeftService'];
      options.direction = 'both';

      result = filterGraph(diamondGraph, options);
      expect(result.nodes.length).toBe(3); // LeftService + upstream (TopService) + downstream (BottomService)
    });

    it('should handle disconnected components correctly', () => {
      const disconnectedGraph = createDisconnectedComponentsGraph();

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['Component1A'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(disconnectedGraph, options);

      // Should only include first component
      expect(result.nodes.length).toBe(3); // Component1A, Component1B, Component1C
      expect(result.edges.length).toBe(2);

      const nodeIds = result.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['Component1A', 'Component1B', 'Component1C'].sort());
    });

    it('should handle self-referencing nodes correctly', () => {
      const selfRefGraph = createSelfReferencingGraph();

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['SelfRefService'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(selfRefGraph, options);

      expect(result.nodes.length).toBe(2); // SelfRefService + dependent
      expect(result.edges.length).toBe(2); // Self reference + dependency

      const selfRefEdge = result.edges.find(e => e.from === e.to);
      expect(selfRefEdge).toBeDefined();
    });
  });

  describe('Error Recovery Tests', () => {
    it('should handle empty graphs gracefully', () => {
      const emptyGraph: Graph = {
        nodes: [],
        edges: [],
        circularDependencies: []
      };

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['AnyService'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(emptyGraph, options);

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
    });

    it('should handle graphs with nodes but no edges', () => {
      const nodesOnlyGraph: Graph = {
        nodes: [
          { id: 'ServiceA', kind: 'service' },
          { id: 'ServiceB', kind: 'service' }
        ],
        edges: [],
        circularDependencies: []
      };

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['ServiceA'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(nodesOnlyGraph, options);

      expect(result.nodes.length).toBe(1);
      expect(result.nodes[0].id).toBe('ServiceA');
      expect(result.edges).toEqual([]);
    });

    it('should handle malformed circular dependencies gracefully', () => {
      const malformedGraph: Graph = {
        nodes: [
          { id: 'ServiceA', kind: 'service' },
          { id: 'ServiceB', kind: 'service' }
        ],
        edges: [
          { from: 'ServiceA', to: 'ServiceB' }
        ],
        circularDependencies: [
          ['NonExistentService', 'ServiceA'], // Reference to non-existent node
          ['ServiceA', 'ServiceB'] // Not actually a cycle
        ]
      };

      const options: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['ServiceA'],
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      const result = filterGraph(malformedGraph, options);

      // Should filter out invalid circular dependencies
      expect(result.nodes.length).toBe(2);
      expect(result.circularDependencies).toEqual([]);
    });
  });
});

// Helper Functions for Test Graph Creation

function createComplexTestGraph(): Graph {
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

function createSmallTestGraph(): Graph {
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

function createIsolatedNodesGraph(): Graph {
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

function createCycleTestGraph(): Graph {
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

function createBidirectionalTestGraph(): Graph {
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

function createCombinedTestGraph(): Graph {
  const complexGraph = createComplexTestGraph();
  const isolatedGraph = createIsolatedNodesGraph();

  return {
    nodes: [...complexGraph.nodes, ...isolatedGraph.nodes],
    edges: [...complexGraph.edges, ...isolatedGraph.edges],
    circularDependencies: []
  };
}

function createGraphWithEdgeFlags(): Graph {
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

function createMediumTestGraph(nodeCount: number): Graph {
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

function createLargeTestGraph(nodeCount: number): Graph {
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

function createDiamondDependencyGraph(): Graph {
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

function createDisconnectedComponentsGraph(): Graph {
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

function createSelfReferencingGraph(): Graph {
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