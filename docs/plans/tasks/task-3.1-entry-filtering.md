# Task 3.1: FR-07 - Entry Point Filtering

**Milestone**: 3 - Advanced Features  
**Priority**: Medium  
**Dependencies**: Task 2.1 (Graph Building)  
**Functional Requirement**: FR-07 - Support `--entry` for sub-graph extraction via DFS/BFS  
**TDD Focus**: Test graph traversal and subgraph extraction

## Overview
Implement graph filtering to extract subgraphs starting from specified entry points. This enables users to focus on specific parts of large dependency graphs.

## TDD Implementation Steps

### 1. Write Tests First (RED Phase)
Create test cases in `tests/entry-filtering.test.ts`:

```typescript
describe('Entry Point Filtering', () => {
  let builder: GraphBuilder;
  
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

  beforeEach(() => {
    builder = new GraphBuilder({
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['TestComponent']
    });
  });

  it('should filter downstream dependencies correctly', () => {
    const filteredGraph = builder.filterByEntry(sampleGraph);

    expect(filteredGraph.nodes.map(n => n.id)).toEqual([
      'TestComponent', 'ServiceA', 'ServiceB', 'ServiceC'
    ]);
    expect(filteredGraph.edges).toHaveLength(3);
    expect(filteredGraph.nodes.find(n => n.id === 'UnrelatedService')).toBeUndefined();
  });

  it('should handle multiple entry points', () => {
    const multiEntryBuilder = new GraphBuilder({
      ...builder._options,
      entry: ['TestComponent', 'UnrelatedService']
    });

    const filteredGraph = multiEntryBuilder.filterByEntry(sampleGraph);

    expect(filteredGraph.nodes).toHaveLength(5); // All nodes included
    expect(filteredGraph.nodes.find(n => n.id === 'UnrelatedService')).toBeDefined();
  });

  it('should return empty graph for non-existent entries', () => {
    const nonExistentBuilder = new GraphBuilder({
      ...builder._options,
      entry: ['NonExistentService']
    });

    const filteredGraph = nonExistentBuilder.filterByEntry(sampleGraph);

    expect(filteredGraph.nodes).toHaveLength(0);
    expect(filteredGraph.edges).toHaveLength(0);
  });

  it('should preserve dependency relationships in subgraph', () => {
    const filteredGraph = builder.filterByEntry(sampleGraph);

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

    const circularBuilder = new GraphBuilder({
      ...builder._options,
      entry: ['ServiceA']
    });

    const filteredGraph = circularBuilder.filterByEntry(circularGraph);

    expect(filteredGraph.circularDependencies).toContainEqual(['ServiceA', 'ServiceB', 'ServiceA']);
    expect(filteredGraph.edges.filter(e => e.isCircular)).toHaveLength(2);
  });

  it('should work with single entry point', () => {
    const singleEntryBuilder = new GraphBuilder({
      ...builder._options,
      entry: ['ServiceA']
    });

    const filteredGraph = singleEntryBuilder.filterByEntry(sampleGraph);

    expect(filteredGraph.nodes.map(n => n.id)).toEqual(['ServiceA', 'ServiceB']);
    expect(filteredGraph.edges).toHaveLength(1);
    expect(filteredGraph.edges[0]).toEqual({
      from: 'ServiceA',
      to: 'ServiceB',
      flags: {}
    });
  });

  it('should preserve all node kinds in filtered graph', () => {
    const filteredGraph = builder.filterByEntry(sampleGraph);

    const component = filteredGraph.nodes.find(n => n.id === 'TestComponent');
    expect(component?.kind).toBe('component');
    
    const services = filteredGraph.nodes.filter(n => n.kind === 'service');
    expect(services).toHaveLength(3);
  });
});
```

### 2. Implement Graph Filtering Algorithm (GREEN Phase)
Update `src/core/graph-builder.ts`:

```typescript
export class GraphBuilder {
  // ... existing code ...

  buildGraph(parsedClasses: ParsedClass[]): Graph {
    // ... existing graph building ...

    let finalGraph = graph;

    // Apply entry filtering if specified
    if (this._options.entry && this._options.entry.length > 0) {
      finalGraph = this.filterByEntry(finalGraph);
    }

    return finalGraph;
  }

  filterByEntry(graph: Graph): Graph {
    if (!this._options.entry || this._options.entry.length === 0) {
      return graph; // No filtering needed
    }

    const includedNodeIds = new Set<string>();
    const adjacencyList = this._buildAdjacencyList(graph);

    // Perform DFS/BFS from each entry point
    for (const entryPoint of this._options.entry) {
      if (graph.nodes.some(n => n.id === entryPoint)) {
        this._traverseFromEntry(entryPoint, adjacencyList, includedNodeIds);
      } else if (this._options.verbose) {
        console.warn(`Entry point '${entryPoint}' not found in graph`);
      }
    }

    // Filter nodes and edges
    const filteredNodes = graph.nodes.filter(node => includedNodeIds.has(node.id));
    const filteredEdges = graph.edges.filter(edge => 
      includedNodeIds.has(edge.from) && includedNodeIds.has(edge.to)
    );

    // Filter circular dependencies  
    const filteredCircularDeps = graph.circularDependencies.filter(cycle => 
      cycle.every(nodeId => includedNodeIds.has(nodeId))
    );

    if (this._options.verbose) {
      console.log(`Filtered graph: ${filteredNodes.length} nodes, ${filteredEdges.length} edges`);
      console.log(`Entry points: ${this._options.entry.join(', ')}`);
    }

    return {
      nodes: filteredNodes,
      edges: filteredEdges,
      circularDependencies: filteredCircularDeps
    };
  }

  private _traverseFromEntry(
    startNode: string,
    adjacencyList: Map<string, string[]>,
    visited: Set<string>
  ): void {
    const stack = [startNode];
    
    while (stack.length > 0) {
      const currentNode = stack.pop()!;
      
      if (visited.has(currentNode)) {
        continue;
      }
      
      visited.add(currentNode);
      
      // Add neighbors to stack for traversal (downstream direction)
      const neighbors = adjacencyList.get(currentNode) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }
  }

  private _buildAdjacencyList(graph: Graph): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();

    // Initialize empty arrays for all nodes
    for (const node of graph.nodes) {
      adjacencyList.set(node.id, []);
    }

    // Populate from edges based on direction
    for (const edge of graph.edges) {
      if (this._options.direction === 'downstream' || this._options.direction === 'both') {
        const neighbors = adjacencyList.get(edge.from) || [];
        neighbors.push(edge.to);
        adjacencyList.set(edge.from, neighbors);
      }
      
      // Upstream will be implemented in Task 3.2
    }

    return adjacencyList;
  }
}
```

### 3. Update CLI Integration (GREEN Phase)
Ensure CLI properly handles entry option:

```typescript
// src/cli/index.ts - should already be set up from earlier tasks
program
  .option('-e, --entry <symbol...>', 'one or more starting nodes')
  // ... other options
```

### 4. Refactor (REFACTOR Phase)
- Extract traversal algorithm for reusability
- Add breadth-first search option for different traversal patterns
- Optimize for large graphs with many entry points
- Add progress reporting for verbose mode

## Implementation Details

### Files to Modify
- `src/core/graph-builder.ts` - Main filtering implementation
- `tests/entry-filtering.test.ts` - Comprehensive tests
- `src/cli/index.ts` - Ensure entry option is properly processed

### Traversal Algorithm
**Depth-First Search (DFS)** using iterative approach:
- Start from each specified entry point
- Follow edges in downstream direction
- Mark all reachable nodes for inclusion
- Time complexity: O(V + E) per entry point

### Direction Support
- **Downstream**: Follow edges from source to target (default)
- **Upstream**: Follow edges from target to source (Task 3.2)
- **Both**: Follow edges in both directions (Task 3.2)

### Subgraph Consistency
- Include only nodes reachable from entry points
- Include only edges between included nodes
- Preserve circular dependency information for included cycles
- Maintain node kinds and edge flags

### Performance Considerations
- Use Set for O(1) inclusion checks
- Avoid redundant traversals with visited tracking
- Early termination when all reachable nodes found
- Memory-efficient subgraph construction

## Acceptance Criteria
- [ ] Correct subgraph extraction starting from single entry point
- [ ] Multiple entry points supported and merged correctly
- [ ] Non-existent entry points handled gracefully with warning
- [ ] Dependency relationships preserved in filtered subgraph
- [ ] Circular dependencies maintained if within filtered subgraph
- [ ] Empty graph returned for invalid entry points
- [ ] Node kinds and edge flags preserved in filtered graph
- [ ] Test coverage >90% for filtering logic
- [ ] Performance: Filters 1000+ node graph in <200ms

## Success Metrics
- **Filtering Accuracy**: 100% correct subgraph extraction
- **Performance**: <200ms for 1000 nodes with 10 entry points
- **Memory Usage**: Efficient subgraph construction
- **Integration**: Seamless CLI integration with other options

## Integration Points
- Builds on Task 2.1 graph construction
- Foundation for Task 3.2 bidirectional filtering
- Works with Task 2.2 output formatting
- Compatible with Task 4.3 circular dependency detection

## Next Task
Upon completion, proceed to **Task 3.2: Bidirectional Filtering** to add upstream and both-direction filtering support.