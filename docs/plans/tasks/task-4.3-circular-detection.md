# Task 4.3: FR-11 - Circular Dependency Detection

**Milestone**: 4 - Error Handling and Robustness  
**Priority**: Medium  
**Dependencies**: Task 2.1 (Graph Building)  
**Functional Requirement**: FR-11 - Detect and report circular dependencies in the dependency graph  
**TDD Focus**: Test cycle detection algorithms and reporting

## Overview
Implement graph cycle detection to identify circular dependencies in the dependency injection graph. This provides critical debugging information for Angular applications.

## TDD Implementation Steps

### 1. Write Tests First (RED Phase)
Create test cases in `tests/circular-detection.test.ts`:

```typescript
describe('Circular Dependency Detection', () => {
  let builder: GraphBuilder;
  const defaultOptions: CliOptions = {
    project: './tsconfig.json',
    format: 'json',
    direction: 'downstream',
    includeDecorators: false,
    verbose: false
  };

  beforeEach(() => {
    builder = new GraphBuilder(defaultOptions);
  });

  it('should detect simple circular dependencies', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'ServiceA',
        kind: 'service',
        dependencies: [{ token: 'ServiceB', flags: {}, parameterName: 'serviceB' }],
        filePath: '/test/serviceA.ts'
      },
      {
        name: 'ServiceB', 
        kind: 'service',
        dependencies: [{ token: 'ServiceA', flags: {}, parameterName: 'serviceA' }],
        filePath: '/test/serviceB.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.circularDependencies).toHaveLength(1);
    expect(graph.circularDependencies[0]).toEqual(['ServiceA', 'ServiceB', 'ServiceA']);
    
    // Edges should be marked as circular
    const circularEdges = graph.edges.filter(e => e.isCircular);
    expect(circularEdges).toHaveLength(2);
  });

  it('should detect complex circular chains', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'ServiceA',
        kind: 'service',
        dependencies: [{ token: 'ServiceB', flags: {}, parameterName: 'serviceB' }],
        filePath: '/test/serviceA.ts'
      },
      {
        name: 'ServiceB',
        kind: 'service', 
        dependencies: [{ token: 'ServiceC', flags: {}, parameterName: 'serviceC' }],
        filePath: '/test/serviceB.ts'
      },
      {
        name: 'ServiceC',
        kind: 'service',
        dependencies: [{ token: 'ServiceA', flags: {}, parameterName: 'serviceA' }],
        filePath: '/test/serviceC.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.circularDependencies).toHaveLength(1);
    expect(graph.circularDependencies[0]).toEqual(['ServiceA', 'ServiceB', 'ServiceC', 'ServiceA']);
    
    const circularEdges = graph.edges.filter(e => e.isCircular);
    expect(circularEdges).toHaveLength(3);
  });

  it('should report all circular paths in complex graphs', () => {
    const parsedClasses: ParsedClass[] = [
      // First cycle: A -> B -> A
      {
        name: 'ServiceA',
        kind: 'service',
        dependencies: [{ token: 'ServiceB', flags: {}, parameterName: 'serviceB' }],
        filePath: '/test/serviceA.ts'
      },
      {
        name: 'ServiceB',
        kind: 'service',
        dependencies: [{ token: 'ServiceA', flags: {}, parameterName: 'serviceA' }],
        filePath: '/test/serviceB.ts'
      },
      // Second cycle: C -> D -> C  
      {
        name: 'ServiceC',
        kind: 'service',
        dependencies: [{ token: 'ServiceD', flags: {}, parameterName: 'serviceD' }],
        filePath: '/test/serviceC.ts'
      },
      {
        name: 'ServiceD',
        kind: 'service',
        dependencies: [{ token: 'ServiceC', flags: {}, parameterName: 'serviceC' }],
        filePath: '/test/serviceD.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.circularDependencies).toHaveLength(2);
    expect(graph.circularDependencies).toContainEqual(['ServiceA', 'ServiceB', 'ServiceA']);
    expect(graph.circularDependencies).toContainEqual(['ServiceC', 'ServiceD', 'ServiceC']);
  });

  it('should continue processing after detection', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'ServiceA',
        kind: 'service',
        dependencies: [{ token: 'ServiceB', flags: {}, parameterName: 'serviceB' }],
        filePath: '/test/serviceA.ts'
      },
      {
        name: 'ServiceB',
        kind: 'service',
        dependencies: [{ token: 'ServiceA', flags: {}, parameterName: 'serviceA' }],
        filePath: '/test/serviceB.ts'
      },
      {
        name: 'ServiceC',
        kind: 'service',
        dependencies: [], // No circular dependency
        filePath: '/test/serviceC.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    // Should have detected circular and included all nodes
    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toHaveLength(2);
    expect(graph.circularDependencies).toHaveLength(1);
  });

  it('should handle self-dependencies', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'ServiceA',
        kind: 'service',
        dependencies: [{ token: 'ServiceA', flags: {}, parameterName: 'self' }],
        filePath: '/test/serviceA.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.circularDependencies).toHaveLength(1);
    expect(graph.circularDependencies[0]).toEqual(['ServiceA', 'ServiceA']);
    
    const selfEdge = graph.edges.find(e => e.from === 'ServiceA' && e.to === 'ServiceA');
    expect(selfEdge?.isCircular).toBe(true);
  });

  it('should not detect cycles in acyclic graphs', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'ServiceA',
        kind: 'service',
        dependencies: [{ token: 'ServiceB', flags: {}, parameterName: 'serviceB' }],
        filePath: '/test/serviceA.ts'
      },
      {
        name: 'ServiceB',
        kind: 'service',
        dependencies: [{ token: 'ServiceC', flags: {}, parameterName: 'serviceC' }],
        filePath: '/test/serviceB.ts'
      },
      {
        name: 'ServiceC',
        kind: 'service',
        dependencies: [], // No circular dependency
        filePath: '/test/serviceC.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.circularDependencies).toHaveLength(0);
    expect(graph.edges.every(e => !e.isCircular)).toBe(true);
  });
});
```

### 2. Implement Cycle Detection Algorithm (GREEN Phase)
Update `src/core/graph-builder.ts`:

```typescript
export class GraphBuilder {
  // ... existing code ...

  buildGraph(parsedClasses: ParsedClass[]): Graph {
    // ... existing node and edge creation ...

    // Detect circular dependencies
    const circularDependencies = this._detectCircularDependencies(graph);
    
    // Mark circular edges
    this._markCircularEdges(graph, circularDependencies);

    return {
      ...graph,
      circularDependencies
    };
  }

  private _detectCircularDependencies(graph: Graph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const adjacencyList = this._buildAdjacencyList(graph);

    // DFS to detect cycles
    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        const path: string[] = [];
        this._dfsDetectCycles(node.id, adjacencyList, visited, recursionStack, path, cycles);
      }
    }

    return cycles;
  }

  private _dfsDetectCycles(
    node: string,
    adjacencyList: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>,
    path: string[],
    cycles: string[][]
  ): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const neighbors = adjacencyList.get(node) || [];
    
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this._dfsDetectCycles(neighbor, adjacencyList, visited, recursionStack, path, cycles)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle - extract the cycle path
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor); // Complete the cycle
        cycles.push([...cycle]);
      }
    }

    recursionStack.delete(node);
    path.pop();
    return false;
  }

  private _buildAdjacencyList(graph: Graph): Map<string, string[]> {
    const adjacencyList = new Map<string, string[]>();

    // Initialize with empty arrays for all nodes
    for (const node of graph.nodes) {
      adjacencyList.set(node.id, []);
    }

    // Populate adjacency list from edges
    for (const edge of graph.edges) {
      const neighbors = adjacencyList.get(edge.from) || [];
      neighbors.push(edge.to);
      adjacencyList.set(edge.from, neighbors);
    }

    return adjacencyList;
  }

  private _markCircularEdges(graph: Graph, cycles: string[][]): void {
    const circularEdgePairs = new Set<string>();

    // Extract all edge pairs that are part of cycles
    for (const cycle of cycles) {
      for (let i = 0; i < cycle.length - 1; i++) {
        const from = cycle[i];
        const to = cycle[i + 1];
        circularEdgePairs.add(`${from}->${to}`);
      }
    }

    // Mark edges as circular
    for (const edge of graph.edges) {
      const edgeKey = `${edge.from}->${edge.to}`;
      if (circularEdgePairs.has(edgeKey)) {
        edge.isCircular = true;
      }
    }
  }
}
```

### 3. Add Verbose Logging (GREEN Phase)
Add logging support for verbose mode:

```typescript
private _detectCircularDependencies(graph: Graph): string[][] {
  if (this._options.verbose) {
    console.log('Detecting circular dependencies...');
  }

  const cycles = // ... detection logic ...

  if (this._options.verbose) {
    console.log(`Found ${cycles.length} circular dependency cycles`);
    for (const cycle of cycles) {
      console.log(`  Cycle: ${cycle.join(' -> ')}`);
    }
  }

  return cycles;
}
```

### 4. Refactor (REFACTOR Phase)
- Optimize algorithm for large graphs
- Add cycle simplification (remove duplicate cycles)
- Extract reusable graph algorithms
- Add performance monitoring

## Implementation Details

### Files to Modify
- `src/core/graph-builder.ts` - Main implementation
- `tests/circular-detection.test.ts` - Comprehensive tests
- `src/types/index.ts` - Ensure Edge.isCircular is defined

### Algorithm Choice
**Depth-First Search (DFS)** with recursion stack:
- Time Complexity: O(V + E) where V=nodes, E=edges
- Space Complexity: O(V) for recursion stack
- Detects all cycles efficiently
- Handles complex cycle scenarios

### Cycle Representation
Cycles stored as arrays of node names forming complete paths:
- `['ServiceA', 'ServiceB', 'ServiceA']` for simple cycle
- `['ServiceA', 'ServiceB', 'ServiceC', 'ServiceA']` for complex cycle

### Edge Marking Strategy
- Mark all edges that participate in any detected cycle
- Use `isCircular: true` flag on Edge objects
- Enables special rendering in Mermaid output

### Performance Considerations
- Efficient adjacency list representation
- Early termination when possible
- Memory-efficient cycle storage
- Avoid redundant cycle detection

## Acceptance Criteria
- [ ] Simple circular dependencies (A -> B -> A) detected correctly
- [ ] Complex circular chains (A -> B -> C -> A) detected correctly
- [ ] All circular paths reported in complex graphs with multiple cycles
- [ ] Self-dependencies (A -> A) detected and handled
- [ ] Acyclic graphs return empty circular dependencies array
- [ ] Processing continues normally after cycle detection
- [ ] Circular edges marked with `isCircular: true` flag
- [ ] Test coverage >90% for cycle detection logic
- [ ] Performance: Detects cycles in 1000+ node graph in <500ms

## Success Metrics
- **Detection Accuracy**: 100% correct cycle identification
- **Performance**: <500ms for 1000 nodes with cycles
- **Memory Usage**: Efficient memory usage during detection
- **Coverage**: All cycle types (simple, complex, self, multiple) tested

## Integration Points
- Integrates with Task 2.1 graph building
- Supports Task 2.2 Mermaid output formatting
- Enhances Task 5.1 verbose mode reporting

## Next Task
Upon completion, all core functionality will be implemented. Proceed to **Task 5.1: Verbose Mode** for debugging and diagnostic features.