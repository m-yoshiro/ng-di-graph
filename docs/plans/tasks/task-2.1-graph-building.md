# Task 2.1: FR-05 - Graph Building Infrastructure

**Milestone**: 2 - Core Features  
**Priority**: High  
**Dependencies**: All Milestone 1 tasks (1.1, 1.2, 1.3)  
**Functional Requirement**: FR-05 - Build an in-memory graph; expose it as JSON and Mermaid  
**TDD Focus**: Test graph construction from parsed classes

## Overview
Transform parsed classes and dependencies into the in-memory Graph data structure. This is the core transformation that enables all output formats and graph operations.

## TDD Implementation Steps

### 1. Write Tests First (RED Phase)
Create test cases in `tests/graph-builder.test.ts`:

```typescript
describe('GraphBuilder - Graph Construction', () => {
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

  it('should create nodes from parsed classes', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'TestService',
        kind: 'service',
        dependencies: [],
        filePath: '/test/service.ts'
      },
      {
        name: 'TestComponent',
        kind: 'component', 
        dependencies: [],
        filePath: '/test/component.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes).toContainEqual({ id: 'TestService', kind: 'service' });
    expect(graph.nodes).toContainEqual({ id: 'TestComponent', kind: 'component' });
  });

  it('should create edges from dependencies', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'TestService',
        kind: 'service',
        dependencies: [],
        filePath: '/test/service.ts'
      },
      {
        name: 'TestComponent',
        kind: 'component',
        dependencies: [
          {
            token: 'TestService',
            flags: {},
            parameterName: 'service'
          }
        ],
        filePath: '/test/component.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toEqual({
      from: 'TestComponent',
      to: 'TestService',
      flags: {}
    });
  });

  it('should handle empty input gracefully', () => {
    const graph = builder.buildGraph([]);

    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
    expect(graph.circularDependencies).toHaveLength(0);
  });

  it('should maintain node uniqueness', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'TestService',
        kind: 'service',
        dependencies: [],
        filePath: '/test/service.ts'
      },
      // Duplicate (shouldn't happen in practice, but test robustness)
      {
        name: 'TestService', 
        kind: 'service',
        dependencies: [],
        filePath: '/test/service2.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0]).toEqual({ id: 'TestService', kind: 'service' });
  });

  it('should handle missing dependency targets', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'TestComponent',
        kind: 'component',
        dependencies: [
          {
            token: 'MissingService', // Not in parsed classes
            flags: {},
            parameterName: 'missing'
          }
        ],
        filePath: '/test/component.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.nodes).toHaveLength(2); // Component + missing service node
    expect(graph.nodes).toContainEqual({ id: 'TestComponent', kind: 'component' });
    expect(graph.nodes).toContainEqual({ id: 'MissingService', kind: 'unknown' });
    expect(graph.edges).toHaveLength(1);
  });

  it('should preserve edge flags when provided', () => {
    const parsedClasses: ParsedClass[] = [
      {
        name: 'TestService',
        kind: 'service',
        dependencies: [],
        filePath: '/test/service.ts'
      },
      {
        name: 'TestComponent',
        kind: 'component',
        dependencies: [
          {
            token: 'TestService',
            flags: { optional: true, self: true },
            parameterName: 'service'
          }
        ],
        filePath: '/test/component.ts'
      }
    ];

    const graph = builder.buildGraph(parsedClasses);

    expect(graph.edges[0].flags).toEqual({ optional: true, self: true });
  });
});
```

### 2. Implement buildGraph() Method (GREEN Phase)
Update `src/core/graph-builder.ts`:

```typescript
import { Graph, ParsedClass, Node, Edge, CliOptions } from '../types';

export class GraphBuilder {
  constructor(private _options: CliOptions) {}

  buildGraph(parsedClasses: ParsedClass[]): Graph {
    const nodeMap = new Map<string, Node>();
    const edges: Edge[] = [];

    // First pass: Create all nodes
    for (const parsedClass of parsedClasses) {
      if (!nodeMap.has(parsedClass.name)) {
        nodeMap.set(parsedClass.name, {
          id: parsedClass.name,
          kind: parsedClass.kind
        });
      }
    }

    // Second pass: Create edges and missing dependency nodes
    for (const parsedClass of parsedClasses) {
      for (const dependency of parsedClass.dependencies) {
        // Ensure dependency target exists as a node
        if (!nodeMap.has(dependency.token)) {
          nodeMap.set(dependency.token, {
            id: dependency.token,
            kind: 'unknown' // Unknown because not in parsed classes
          });
        }

        // Create edge
        const edge: Edge = {
          from: parsedClass.name,
          to: dependency.token,
          flags: dependency.flags
        };

        edges.push(edge);
      }
    }

    // Convert map to array and sort for consistent output
    const nodes = Array.from(nodeMap.values()).sort((a, b) => a.id.localeCompare(b.id));

    return {
      nodes,
      edges,
      circularDependencies: [] // Will be implemented in Task 4.3
    };
  }
}
```

### 3. Add Integration Tests (GREEN Phase)
Create integration test in `tests/integration.test.ts`:

```typescript
describe('Integration - Parser to Graph', () => {
  it('should build complete graph from parsed classes', () => {
    const parser = new AngularParser({
      project: './test-fixtures/tsconfig.json',
      format: 'json',
      direction: 'downstream', 
      includeDecorators: false,
      verbose: false
    });

    parser.loadProject();
    const parsedClasses = parser.findDecoratedClasses();
    
    const builder = new GraphBuilder(parser._options);
    const graph = builder.buildGraph(parsedClasses);

    // Verify complete pipeline
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
    
    // Verify node consistency
    const nodeIds = graph.nodes.map(n => n.id);
    for (const edge of graph.edges) {
      expect(nodeIds).toContain(edge.from);
      expect(nodeIds).toContain(edge.to);
    }
  });
});
```

### 4. Refactor (REFACTOR Phase)
- Extract node creation logic for reusability
- Add validation for graph integrity
- Optimize for large graphs
- Add logging for verbose mode

## Implementation Details

### Files to Modify
- `src/core/graph-builder.ts` - Main implementation
- `tests/graph-builder.test.ts` - Unit tests
- `tests/integration.test.ts` - Integration tests
- `src/types/index.ts` - Ensure Graph interface is complete

### Graph Construction Algorithm
1. **First Pass**: Create nodes for all parsed classes
2. **Second Pass**: Process dependencies to create edges
3. **Dependency Resolution**: Create 'unknown' nodes for missing dependencies
4. **Validation**: Ensure graph integrity and consistency

### Handling Missing Dependencies
When a dependency token doesn't match any parsed class:
- Create an 'unknown' node for the missing dependency
- Log warning in verbose mode
- Continue processing (graceful degradation)

### Performance Considerations
- Use Map for O(1) node lookups during construction
- Sort output for consistent results
- Consider streaming for very large graphs

### Error Handling
- Invalid dependency tokens: skip with warning
- Duplicate nodes: use first occurrence
- Self-dependencies: allow but may flag as circular later

## Acceptance Criteria
- [ ] Correct node creation from all parsed classes
- [ ] Proper edge generation from all dependencies
- [ ] No duplicate nodes in output (uniqueness maintained)
- [ ] Missing dependencies create 'unknown' nodes
- [ ] Edge flags preserved from parsed dependencies
- [ ] Empty input handled gracefully (empty graph)
- [ ] Consistent output ordering (sorted by node ID)
- [ ] Test coverage >90% for graph building logic
- [ ] Integration test passes with real parsed data

## Success Metrics
- **Test Coverage**: >90% for GraphBuilder class
- **Accuracy**: 100% correct node/edge creation for valid inputs
- **Performance**: Builds graph of 1000+ nodes in <100ms
- **Memory**: Efficient memory usage, no memory leaks

## Integration Points
- Consumes output from Milestone 1 parsing tasks
- Provides input for Task 2.2 output formatting
- Foundation for Task 3.1 entry filtering
- Supports Task 4.3 circular dependency detection

## Next Task
Upon completion, proceed to **Task 2.2: Output Formatting** to implement JSON and Mermaid formatters for the constructed graph.