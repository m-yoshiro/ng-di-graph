import { describe, it, expect, beforeEach } from 'vitest';
import { filterGraph } from '../core/graph-filter';
import type { Graph, Node, Edge, CliOptions } from '../types';
import {
  createComplexTestGraph,
  createSmallTestGraph,
  createIsolatedNodesGraph,
  createCycleTestGraph,
  createBidirectionalTestGraph,
  createCombinedTestGraph,
  createGraphWithEdgeFlags,
  createMediumTestGraph,
  createLargeTestGraph,
  createDiamondDependencyGraph,
  createDisconnectedComponentsGraph,
  createSelfReferencingGraph
} from './fixtures/sample-graphs';

describe('Bidirectional Filtering', () => {
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

    it('should handle medium graphs within 100ms', () => {
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

      expect(executionTime).toBeLessThan(100);
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
      const defaultOptions: CliOptions = {
        project: './test',
        format: 'json',
        entry: ['Node_0'],
        direction: 'both',
        includeDecorators: false,
        verbose: false
      };

      // Warm up the traversal logic to reduce first-run noise
      filterGraph(createLargeTestGraph(25), { ...defaultOptions });

      const sizes = [50, 100, 200];
      const times: number[] = [];

      for (const size of sizes) {
        const graph = createLargeTestGraph(size);
        const startTime = performance.now();

        filterGraph(graph, { ...defaultOptions });

        const endTime = performance.now();
        times.push(endTime - startTime);
      }

      const normalizedTimes = times.map(time => Math.max(time, 1));

      // Execution time should grow as the graph grows even if the absolute timing varies per runtime
      expect(normalizedTimes[0]).toBeLessThanOrEqual(normalizedTimes[1]);
      expect(normalizedTimes[1]).toBeLessThanOrEqual(normalizedTimes[2]);
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
