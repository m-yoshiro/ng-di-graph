import { describe, it, expect, beforeEach } from 'bun:test';
import { buildGraph } from '../core/graph-builder';
import { filterGraph } from '../core/graph-filter';
import type { Graph, CliOptions, ParsedClass } from '../types';

describe('Entry Point Filtering', () => {
  // Sample graph: Component -> ServiceA -> ServiceB
  //                         -> ServiceC
  const sampleGraph: Graph = {
    nodes: [
      { id: 'TestComponent', kind: 'component' },
      { id: 'ServiceA', kind: 'service' },
      { id: 'ServiceB', kind: 'service' },
      { id: 'ServiceC', kind: 'service' },
      { id: 'UnrelatedService', kind: 'service' }
    ],
    edges: [
      { from: 'TestComponent', to: 'ServiceA', flags: {} },
      { from: 'TestComponent', to: 'ServiceC', flags: {} },
      { from: 'ServiceA', to: 'ServiceB', flags: {} }
    ],
    circularDependencies: []
  };

  it('should filter downstream dependencies correctly', () => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['TestComponent']
    };

    const filteredGraph = filterGraph(sampleGraph, options);

    expect(filteredGraph.nodes.map(n => n.id)).toEqual([
      'TestComponent', 'ServiceA', 'ServiceB', 'ServiceC'
    ]);
    expect(filteredGraph.edges).toHaveLength(3);
    expect(filteredGraph.nodes.find(n => n.id === 'UnrelatedService')).toBeUndefined();
  });

  it('should handle multiple entry points', () => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['TestComponent', 'UnrelatedService']
    };

    const filteredGraph = filterGraph(sampleGraph, options);

    expect(filteredGraph.nodes).toHaveLength(5); // All nodes included
    expect(filteredGraph.nodes.find(n => n.id === 'UnrelatedService')).toBeDefined();
  });

  it('should return empty graph for non-existent entries', () => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['NonExistentService']
    };

    const filteredGraph = filterGraph(sampleGraph, options);

    expect(filteredGraph.nodes).toHaveLength(0);
    expect(filteredGraph.edges).toHaveLength(0);
  });

  it('should preserve dependency relationships in subgraph', () => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['TestComponent']
    };

    const filteredGraph = filterGraph(sampleGraph, options);

    // Should preserve all edges that connect included nodes
    expect(filteredGraph.edges).toContainEqual({
      from: 'TestComponent',
      to: 'ServiceA',
      flags: {}
    });
    expect(filteredGraph.edges).toContainEqual({
      from: 'ServiceA',
      to: 'ServiceB', 
      flags: {}
    });
    expect(filteredGraph.edges).toContainEqual({
      from: 'TestComponent',
      to: 'ServiceC',
      flags: {}
    });
  });

  it('should handle circular dependencies in filtered graph', () => {
    const circularGraph: Graph = {
      nodes: [
        { id: 'ServiceA', kind: 'service' },
        { id: 'ServiceB', kind: 'service' },
        { id: 'ServiceC', kind: 'service' }
      ],
      edges: [
        { from: 'ServiceA', to: 'ServiceB', flags: {}, isCircular: true },
        { from: 'ServiceB', to: 'ServiceA', flags: {}, isCircular: true },
        { from: 'ServiceA', to: 'ServiceC', flags: {} }
      ],
      circularDependencies: [['ServiceA', 'ServiceB', 'ServiceA']]
    };

    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['ServiceA']
    };

    const filteredGraph = filterGraph(circularGraph, options);

    expect(filteredGraph.circularDependencies).toContainEqual(['ServiceA', 'ServiceB', 'ServiceA']);
    expect(filteredGraph.edges.filter(e => e.isCircular)).toHaveLength(2);
  });

  it('should work with single entry point', () => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['ServiceA']
    };

    const filteredGraph = filterGraph(sampleGraph, options);

    expect(filteredGraph.nodes.map(n => n.id)).toEqual(['ServiceA', 'ServiceB']);
    expect(filteredGraph.edges).toHaveLength(1);
    expect(filteredGraph.edges[0]).toEqual({
      from: 'ServiceA',
      to: 'ServiceB',
      flags: {}
    });
  });

  it('should preserve all node kinds in filtered graph', () => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['TestComponent']
    };

    const filteredGraph = filterGraph(sampleGraph, options);

    const component = filteredGraph.nodes.find(n => n.id === 'TestComponent');
    expect(component?.kind).toBe('component');
    
    const services = filteredGraph.nodes.filter(n => n.kind === 'service');
    expect(services).toHaveLength(3);
  });

  it('should return original graph when no entry filter specified', () => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false
      // no entry option
    };

    const filteredGraph = filterGraph(sampleGraph, options);

    expect(filteredGraph).toEqual(sampleGraph);
  });

  it('should return original graph when entry array is empty', () => {
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: []
    };

    const filteredGraph = filterGraph(sampleGraph, options);

    expect(filteredGraph).toEqual(sampleGraph);
  });

  it('should handle edge flags preservation during filtering', () => {
    const graphWithFlags: Graph = {
      nodes: [
        { id: 'Component', kind: 'component' },
        { id: 'ServiceA', kind: 'service' },
        { id: 'ServiceB', kind: 'service' }
      ],
      edges: [
        { 
          from: 'Component', 
          to: 'ServiceA', 
          flags: { optional: true, self: true }
        },
        { 
          from: 'ServiceA', 
          to: 'ServiceB', 
          flags: { skipSelf: true }
        }
      ],
      circularDependencies: []
    };

    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['Component']
    };

    const filteredGraph = filterGraph(graphWithFlags, options);

    expect(filteredGraph.edges[0].flags).toEqual({ optional: true, self: true });
    expect(filteredGraph.edges[1].flags).toEqual({ skipSelf: true });
  });

  describe('performance', () => {
    it('should filter large graphs efficiently (<200ms for 1000+ nodes)', () => {
      // Create a large graph with 1000 nodes in a tree structure
      const largeGraph: Graph = {
        nodes: [],
        edges: [],
        circularDependencies: []
      };

      // Create nodes
      for (let i = 0; i < 1000; i++) {
        largeGraph.nodes.push({
          id: `Node${i}`,
          kind: i % 2 === 0 ? 'service' : 'component'
        });
      }

      // Create tree structure: Node0 -> Node1, Node0 -> Node2, Node1 -> Node3, etc.
      for (let i = 0; i < 500; i++) {
        largeGraph.edges.push({
          from: `Node${i}`,
          to: `Node${i * 2 + 1}`,
          flags: {}
        });
        if (i * 2 + 2 < 1000) {
          largeGraph.edges.push({
            from: `Node${i}`,
            to: `Node${i * 2 + 2}`,
            flags: {}
          });
        }
      }

      const options: CliOptions = {
        project: './tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false,
        entry: ['Node0']
      };

      const startTime = performance.now();
      const filteredGraph = filterGraph(largeGraph, options);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete filtering within 200ms
      expect(duration).toBeLessThan(200);
      
      // Should include all nodes reachable from Node0 (which is all nodes in this tree)
      expect(filteredGraph.nodes.length).toBe(1000);
      expect(filteredGraph.edges.length).toBe(largeGraph.edges.length);
    });
  });

  describe('warning handling for non-existent entries', () => {
    it('should handle mix of existing and non-existent entries', () => {
      const options: CliOptions = {
        project: './tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false,
        entry: ['TestComponent', 'NonExistent1', 'ServiceA', 'NonExistent2']
      };

      const filteredGraph = filterGraph(sampleGraph, options);

      // Should include nodes reachable from valid entries
      expect(filteredGraph.nodes.length).toBeGreaterThan(0);
      expect(filteredGraph.nodes.find(n => n.id === 'TestComponent')).toBeDefined();
      expect(filteredGraph.nodes.find(n => n.id === 'ServiceA')).toBeDefined();
    });
  });

  describe('Integration with Graph Builder', () => {
    it('should integrate graph building and filtering correctly', () => {
      const sampleParsedClasses: ParsedClass[] = [
        {
          name: 'AppComponent',
          kind: 'component',
          filePath: '/src/app.component.ts',
          dependencies: [
            { token: 'UserService', parameterName: 'userService' },
            { token: 'LogService', parameterName: 'logService' }
          ]
        },
        {
          name: 'UserService',
          kind: 'service',
          filePath: '/src/user.service.ts',
          dependencies: [
            { token: 'HttpClient', parameterName: 'http' }
          ]
        },
        {
          name: 'LogService',
          kind: 'service',
          filePath: '/src/log.service.ts',
          dependencies: []
        },
        {
          name: 'AdminComponent',
          kind: 'component',
          filePath: '/src/admin.component.ts',
          dependencies: [
            { token: 'AdminService', parameterName: 'adminService' }
          ]
        },
        {
          name: 'AdminService',
          kind: 'service',
          filePath: '/src/admin.service.ts',
          dependencies: []
        }
      ];

      // Build the full graph
      const fullGraph = buildGraph(sampleParsedClasses);

      expect(fullGraph.nodes).toHaveLength(6); // 5 parsed + 1 unknown (HttpClient)
      expect(fullGraph.edges).toHaveLength(4);

      // Filter by AppComponent entry point
      const options: CliOptions = {
        project: './tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false,
        entry: ['AppComponent']
      };

      const filteredGraph = filterGraph(fullGraph, options);

      // Should include: AppComponent, UserService, LogService, HttpClient
      // Should exclude: AdminComponent, AdminService
      expect(filteredGraph.nodes).toHaveLength(4);
      expect(filteredGraph.edges).toHaveLength(3);

      const nodeIds = filteredGraph.nodes.map(n => n.id).sort();
      expect(nodeIds).toEqual(['AppComponent', 'HttpClient', 'LogService', 'UserService']);
    });
  });
});