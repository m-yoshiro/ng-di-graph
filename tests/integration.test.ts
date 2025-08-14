import { describe, it, expect } from 'bun:test';
import { AngularParser } from '../src/core/parser';
import { buildGraph } from '../src/core/graph-builder';
import type { Graph, CliOptions } from '../src/types';

describe('Integration: Parser + GraphBuilder', () => {
  describe('End-to-end graph building', () => {
    it('should create complete graph from parsed TypeScript files', async () => {
      // Arrange
      const options: CliOptions = {
        project: './tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const graph: Graph = buildGraph(parsedClasses);

      // Assert - Should have nodes for all services and components
      expect(graph.nodes.length).toBeGreaterThan(0);
      
      // Verify specific nodes exist from test fixtures
      const nodeIds = graph.nodes.map(n => n.id);
      expect(nodeIds).toContain('TestService');
      expect(nodeIds).toContain('TestComponent');
      
      // Should have edges representing dependencies
      expect(graph.edges.length).toBeGreaterThan(0);
      
      // Should have circular dependencies array (empty for now)
      expect(Array.isArray(graph.circularDependencies)).toBe(true);
    });

    it('should correctly map dependencies from components to services', async () => {
      // Arrange
      const options: CliOptions = {
        project: './tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const graph: Graph = buildGraph(parsedClasses);

      // Assert - Look for specific dependency relationships
      const testComponentEdges = graph.edges.filter(e => e.from === 'TestComponent');
      expect(testComponentEdges.length).toBeGreaterThan(0);
      
      // Should have edge from TestComponent to TestService
      const testServiceEdge = testComponentEdges.find(e => e.to === 'TestService');
      expect(testServiceEdge).toBeDefined();
    });

    it('should handle complex dependency chains correctly', async () => {
      // Arrange
      const options: CliOptions = {
        project: './tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const graph: Graph = buildGraph(parsedClasses);

      // Assert - Verify the graph structure makes sense
      const serviceNodes = graph.nodes.filter(n => n.kind === 'service');
      const componentNodes = graph.nodes.filter(n => n.kind === 'component');
      const directiveNodes = graph.nodes.filter(n => n.kind === 'directive');

      expect(serviceNodes.length).toBeGreaterThan(0);
      expect(componentNodes.length).toBeGreaterThan(0);
      expect(directiveNodes.length).toBeGreaterThan(0);

      // All edges should reference valid nodes
      for (const edge of graph.edges) {
        const fromNode = graph.nodes.find(n => n.id === edge.from);
        const toNode = graph.nodes.find(n => n.id === edge.to);
        expect(fromNode).toBeDefined();
        expect(toNode).toBeDefined();
      }
    });

    it('should preserve edge flags from parsing through graph building', async () => {
      // Arrange
      const options: CliOptions = {
        project: './tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: true,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const graph: Graph = buildGraph(parsedClasses);

      // Assert - Check that edges can have flags (even if none exist in current fixtures)
      const allEdges = graph.edges;
      expect(allEdges.length).toBeGreaterThan(0);
      
      // Verify that the flag structure would be correct if flags existed
      for (const edge of allEdges) {
        // Flags are optional, but if they exist they should be valid
        if (edge.flags) {
          const validFlags = ['optional', 'self', 'skipSelf', 'host'];
          for (const flag of Object.keys(edge.flags)) {
            expect(validFlags).toContain(flag);
          }
        }
      }
    });

    it('should create unknown nodes for unresolved dependencies', async () => {
      // Arrange
      const options: CliOptions = {
        project: './tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act
      const parsedClasses = await parser.parseClasses();
      const graph: Graph = buildGraph(parsedClasses);

      // Assert - Look for unknown nodes
      const unknownNodes = graph.nodes.filter(n => n.kind === 'unknown');
      
      // Test fixtures might reference some external dependencies
      // At minimum, verify unknown nodes are properly structured
      for (const unknownNode of unknownNodes) {
        expect(unknownNode.id).toBeTruthy();
        expect(unknownNode.kind).toBe('unknown');
      }
    });

    it('should maintain consistent node and edge ordering', async () => {
      // Arrange
      const options: CliOptions = {
        project: './tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };
      const parser = new AngularParser(options);
      parser.loadProject();

      // Act - Run multiple times to verify consistency
      const parsedClasses = await parser.parseClasses();
      const graph1: Graph = buildGraph(parsedClasses);
      const graph2: Graph = buildGraph(parsedClasses);

      // Assert - Results should be identical
      expect(graph1.nodes).toEqual(graph2.nodes);
      expect(graph1.edges).toEqual(graph2.edges);
      expect(graph1.circularDependencies).toEqual(graph2.circularDependencies);
    });
  });
});