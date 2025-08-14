import { describe, it, expect } from 'bun:test';
import { buildGraph } from '../src/core/graph-builder';
import type { ParsedClass, Graph, NodeKind } from '../src/types';

describe('GraphBuilder', () => {
  describe('buildGraph', () => {
    it('should create an empty graph for empty input', () => {
      // Arrange
      const parsedClasses: ParsedClass[] = [];

      // Act
      const result: Graph = buildGraph(parsedClasses);

      // Assert
      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
    });

    it('should create a single node without edges for a class with no dependencies', () => {
      // Arrange
      const parsedClasses: ParsedClass[] = [
        {
          name: 'UserService',
          kind: 'service' as NodeKind,
          filePath: '/src/user.service.ts',
          dependencies: []
        }
      ];

      // Act
      const result: Graph = buildGraph(parsedClasses);

      // Assert
      expect(result.nodes).toEqual([
        { id: 'UserService', kind: 'service' }
      ]);
      expect(result.edges).toEqual([]);
      expect(result.circularDependencies).toEqual([]);
    });

    it('should create nodes and edges for a simple dependency relationship', () => {
      // Arrange
      const parsedClasses: ParsedClass[] = [
        {
          name: 'UserComponent',
          kind: 'component' as NodeKind,
          filePath: '/src/user.component.ts',
          dependencies: [
            {
              token: 'UserService',
              parameterName: 'userService'
            }
          ]
        },
        {
          name: 'UserService',
          kind: 'service' as NodeKind,
          filePath: '/src/user.service.ts',
          dependencies: []
        }
      ];

      // Act
      const result: Graph = buildGraph(parsedClasses);

      // Assert
      expect(result.nodes).toEqual([
        { id: 'UserComponent', kind: 'component' },
        { id: 'UserService', kind: 'service' }
      ]);
      expect(result.edges).toEqual([
        { from: 'UserComponent', to: 'UserService' }
      ]);
      expect(result.circularDependencies).toEqual([]);
    });

    it('should handle missing dependencies by creating unknown nodes', () => {
      // Arrange
      const parsedClasses: ParsedClass[] = [
        {
          name: 'UserComponent',
          kind: 'component' as NodeKind,
          filePath: '/src/user.component.ts',
          dependencies: [
            {
              token: 'MissingService',
              parameterName: 'missingService'
            }
          ]
        }
      ];

      // Act
      const result: Graph = buildGraph(parsedClasses);

      // Assert
      expect(result.nodes).toEqual([
        { id: 'MissingService', kind: 'unknown' },
        { id: 'UserComponent', kind: 'component' }
      ]);
      expect(result.edges).toEqual([
        { from: 'UserComponent', to: 'MissingService' }
      ]);
      expect(result.circularDependencies).toEqual([]);
    });

    it('should preserve edge flags when creating edges', () => {
      // Arrange
      const parsedClasses: ParsedClass[] = [
        {
          name: 'UserComponent',
          kind: 'component' as NodeKind,
          filePath: '/src/user.component.ts',
          dependencies: [
            {
              token: 'UserService',
              parameterName: 'userService',
              flags: {
                optional: true,
                self: true
              }
            }
          ]
        },
        {
          name: 'UserService',
          kind: 'service' as NodeKind,
          filePath: '/src/user.service.ts',
          dependencies: []
        }
      ];

      // Act
      const result: Graph = buildGraph(parsedClasses);

      // Assert
      expect(result.edges).toEqual([
        {
          from: 'UserComponent',
          to: 'UserService',
          flags: {
            optional: true,
            self: true
          }
        }
      ]);
    });

    it('should ensure node uniqueness - no duplicate nodes', () => {
      // Arrange
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ComponentA',
          kind: 'component' as NodeKind,
          filePath: '/src/a.component.ts',
          dependencies: [
            {
              token: 'SharedService',
              parameterName: 'sharedService'
            }
          ]
        },
        {
          name: 'ComponentB',
          kind: 'component' as NodeKind,
          filePath: '/src/b.component.ts',
          dependencies: [
            {
              token: 'SharedService',
              parameterName: 'sharedService'
            }
          ]
        },
        {
          name: 'SharedService',
          kind: 'service' as NodeKind,
          filePath: '/src/shared.service.ts',
          dependencies: []
        }
      ];

      // Act
      const result: Graph = buildGraph(parsedClasses);

      // Assert
      expect(result.nodes).toHaveLength(3);
      expect(result.nodes.find(n => n.id === 'SharedService')).toEqual({
        id: 'SharedService',
        kind: 'service'
      });
      expect(result.edges).toHaveLength(2);
    });

    it('should sort nodes and edges for consistent output', () => {
      // Arrange
      const parsedClasses: ParsedClass[] = [
        {
          name: 'ZService',
          kind: 'service' as NodeKind,
          filePath: '/src/z.service.ts',
          dependencies: []
        },
        {
          name: 'AComponent',
          kind: 'component' as NodeKind,
          filePath: '/src/a.component.ts',
          dependencies: [
            {
              token: 'ZService',
              parameterName: 'zService'
            }
          ]
        }
      ];

      // Act
      const result: Graph = buildGraph(parsedClasses);

      // Assert
      // Nodes should be sorted alphabetically by id
      expect(result.nodes[0].id).toBe('AComponent');
      expect(result.nodes[1].id).toBe('ZService');
      
      // Edges should be sorted by from, then by to
      expect(result.edges[0]).toEqual({
        from: 'AComponent',
        to: 'ZService'
      });
    });

    describe('circular dependency detection', () => {
      it('should detect a simple 2-node circular dependency', () => {
        // Arrange
        const parsedClasses: ParsedClass[] = [
          {
            name: 'ServiceA',
            kind: 'service' as NodeKind,
            filePath: '/src/service-a.ts',
            dependencies: [
              {
                token: 'ServiceB',
                parameterName: 'serviceB'
              }
            ]
          },
          {
            name: 'ServiceB',
            kind: 'service' as NodeKind,
            filePath: '/src/service-b.ts',
            dependencies: [
              {
                token: 'ServiceA',
                parameterName: 'serviceA'
              }
            ]
          }
        ];

        // Act
        const result: Graph = buildGraph(parsedClasses);

        // Assert
        expect(result.circularDependencies).toHaveLength(1);
        expect(result.circularDependencies[0]).toEqual(['ServiceA', 'ServiceB', 'ServiceA']);
        
        // Check that edges are marked as circular
        const edgeAtoB = result.edges.find(e => e.from === 'ServiceA' && e.to === 'ServiceB');
        const edgeBtoA = result.edges.find(e => e.from === 'ServiceB' && e.to === 'ServiceA');
        expect(edgeAtoB?.isCircular).toBe(true);
        expect(edgeBtoA?.isCircular).toBe(true);
      });

      it('should detect a 3-node circular dependency', () => {
        // Arrange
        const parsedClasses: ParsedClass[] = [
          {
            name: 'ServiceA',
            kind: 'service' as NodeKind,
            filePath: '/src/service-a.ts',
            dependencies: [
              {
                token: 'ServiceB',
                parameterName: 'serviceB'
              }
            ]
          },
          {
            name: 'ServiceB',
            kind: 'service' as NodeKind,
            filePath: '/src/service-b.ts',
            dependencies: [
              {
                token: 'ServiceC',
                parameterName: 'serviceC'
              }
            ]
          },
          {
            name: 'ServiceC',
            kind: 'service' as NodeKind,
            filePath: '/src/service-c.ts',
            dependencies: [
              {
                token: 'ServiceA',
                parameterName: 'serviceA'
              }
            ]
          }
        ];

        // Act
        const result: Graph = buildGraph(parsedClasses);

        // Assert
        expect(result.circularDependencies).toHaveLength(1);
        expect(result.circularDependencies[0]).toEqual(['ServiceA', 'ServiceB', 'ServiceC', 'ServiceA']);
        
        // Check that all edges in the cycle are marked as circular
        const edges = result.edges;
        expect(edges.find(e => e.from === 'ServiceA' && e.to === 'ServiceB')?.isCircular).toBe(true);
        expect(edges.find(e => e.from === 'ServiceB' && e.to === 'ServiceC')?.isCircular).toBe(true);
        expect(edges.find(e => e.from === 'ServiceC' && e.to === 'ServiceA')?.isCircular).toBe(true);
      });

      it('should detect multiple separate circular dependencies', () => {
        // Arrange
        const parsedClasses: ParsedClass[] = [
          // First cycle: A -> B -> A
          {
            name: 'ServiceA',
            kind: 'service' as NodeKind,
            filePath: '/src/service-a.ts',
            dependencies: [
              {
                token: 'ServiceB',
                parameterName: 'serviceB'
              }
            ]
          },
          {
            name: 'ServiceB',
            kind: 'service' as NodeKind,
            filePath: '/src/service-b.ts',
            dependencies: [
              {
                token: 'ServiceA',
                parameterName: 'serviceA'
              }
            ]
          },
          // Second cycle: C -> D -> C
          {
            name: 'ServiceC',
            kind: 'service' as NodeKind,
            filePath: '/src/service-c.ts',
            dependencies: [
              {
                token: 'ServiceD',
                parameterName: 'serviceD'
              }
            ]
          },
          {
            name: 'ServiceD',
            kind: 'service' as NodeKind,
            filePath: '/src/service-d.ts',
            dependencies: [
              {
                token: 'ServiceC',
                parameterName: 'serviceC'
              }
            ]
          }
        ];

        // Act
        const result: Graph = buildGraph(parsedClasses);

        // Assert
        expect(result.circularDependencies).toHaveLength(2);
        
        // Check both cycles are detected
        const cycles = result.circularDependencies.sort((a, b) => a[0].localeCompare(b[0]));
        expect(cycles[0]).toEqual(['ServiceA', 'ServiceB', 'ServiceA']);
        expect(cycles[1]).toEqual(['ServiceC', 'ServiceD', 'ServiceC']);
      });

      it('should handle self-referencing dependencies', () => {
        // Arrange
        const parsedClasses: ParsedClass[] = [
          {
            name: 'SelfService',
            kind: 'service' as NodeKind,
            filePath: '/src/self-service.ts',
            dependencies: [
              {
                token: 'SelfService',
                parameterName: 'selfService'
              }
            ]
          }
        ];

        // Act
        const result: Graph = buildGraph(parsedClasses);

        // Assert
        expect(result.circularDependencies).toHaveLength(1);
        expect(result.circularDependencies[0]).toEqual(['SelfService', 'SelfService']);
        
        // Check that the self-edge is marked as circular
        const selfEdge = result.edges.find(e => e.from === 'SelfService' && e.to === 'SelfService');
        expect(selfEdge?.isCircular).toBe(true);
      });

      it('should not mark non-circular edges as circular', () => {
        // Arrange - Tree structure with no cycles
        const parsedClasses: ParsedClass[] = [
          {
            name: 'ComponentA',
            kind: 'component' as NodeKind,
            filePath: '/src/component-a.ts',
            dependencies: [
              {
                token: 'ServiceB',
                parameterName: 'serviceB'
              },
              {
                token: 'ServiceC',
                parameterName: 'serviceC'
              }
            ]
          },
          {
            name: 'ServiceB',
            kind: 'service' as NodeKind,
            filePath: '/src/service-b.ts',
            dependencies: [
              {
                token: 'ServiceD',
                parameterName: 'serviceD'
              }
            ]
          },
          {
            name: 'ServiceC',
            kind: 'service' as NodeKind,
            filePath: '/src/service-c.ts',
            dependencies: []
          },
          {
            name: 'ServiceD',
            kind: 'service' as NodeKind,
            filePath: '/src/service-d.ts',
            dependencies: []
          }
        ];

        // Act
        const result: Graph = buildGraph(parsedClasses);

        // Assert
        expect(result.circularDependencies).toEqual([]);
        
        // Check that no edges are marked as circular
        for (const edge of result.edges) {
          expect(edge.isCircular).toBeFalsy();
        }
      });
    });

    describe('input validation', () => {
      it('should throw error for null input', () => {
        // Act & Assert
        expect(() => buildGraph(null as any)).toThrow('parsedClasses parameter cannot be null or undefined');
      });

      it('should throw error for undefined input', () => {
        // Act & Assert
        expect(() => buildGraph(undefined as any)).toThrow('parsedClasses parameter cannot be null or undefined');
      });

      it('should throw error for malformed ParsedClass - missing name', () => {
        // Arrange
        const malformedClasses = [
          {
            kind: 'service' as NodeKind,
            filePath: '/src/service.ts',
            dependencies: []
          } as any
        ];

        // Act & Assert
        expect(() => buildGraph(malformedClasses)).toThrow('ParsedClass must have a valid name property');
      });

      it('should throw error for malformed ParsedClass - missing kind', () => {
        // Arrange
        const malformedClasses = [
          {
            name: 'TestService',
            filePath: '/src/service.ts',
            dependencies: []
          } as any
        ];

        // Act & Assert
        expect(() => buildGraph(malformedClasses)).toThrow('ParsedClass must have a valid kind property');
      });

      it('should throw error for malformed ParsedClass - missing dependencies', () => {
        // Arrange
        const malformedClasses = [
          {
            name: 'TestService',
            kind: 'service' as NodeKind,
            filePath: '/src/service.ts'
          } as any
        ];

        // Act & Assert
        expect(() => buildGraph(malformedClasses)).toThrow('ParsedClass must have a dependencies array');
      });

      it('should throw error for malformed ParsedClass - invalid dependencies type', () => {
        // Arrange
        const malformedClasses = [
          {
            name: 'TestService',
            kind: 'service' as NodeKind,
            filePath: '/src/service.ts',
            dependencies: 'invalid' as any
          }
        ];

        // Act & Assert
        expect(() => buildGraph(malformedClasses)).toThrow('ParsedClass dependencies must be an array');
      });

      it('should throw error for malformed dependency - missing token', () => {
        // Arrange
        const malformedClasses = [
          {
            name: 'TestService',
            kind: 'service' as NodeKind,
            filePath: '/src/service.ts',
            dependencies: [
              {
                parameterName: 'param'
              } as any
            ]
          }
        ];

        // Act & Assert
        expect(() => buildGraph(malformedClasses)).toThrow('ParsedDependency must have a valid token property');
      });

      it('should handle empty string names gracefully', () => {
        // Arrange
        const classesWithEmptyName = [
          {
            name: '',
            kind: 'service' as NodeKind,
            filePath: '/src/service.ts',
            dependencies: []
          }
        ];

        // Act & Assert
        expect(() => buildGraph(classesWithEmptyName)).toThrow('ParsedClass name cannot be empty');
      });

      it('should handle whitespace-only names gracefully', () => {
        // Arrange
        const classesWithWhitespaceName = [
          {
            name: '   ',
            kind: 'service' as NodeKind,
            filePath: '/src/service.ts',
            dependencies: []
          }
        ];

        // Act & Assert
        expect(() => buildGraph(classesWithWhitespaceName)).toThrow('ParsedClass name cannot be empty');
      });
    });

    describe('performance', () => {
      it('should handle large graphs efficiently (performance requirement)', () => {
        // Arrange - Create a large graph with 100 nodes and no cycles
        const parsedClasses: ParsedClass[] = [];
        
        // Create a tree structure: Node0 -> Node1 -> Node2 -> ... -> Node99
        for (let i = 0; i < 100; i++) {
          const dependencies = i < 99 ? [{ token: `Node${i + 1}`, parameterName: 'dep' }] : [];
          parsedClasses.push({
            name: `Node${i}`,
            kind: 'service' as NodeKind,
            filePath: `/src/node${i}.service.ts`,
            dependencies
          });
        }

        // Act & Assert - Should complete within reasonable time (< 100ms for 100 nodes)
        const startTime = performance.now();
        const result = buildGraph(parsedClasses);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Verify results
        expect(result.nodes).toHaveLength(100);
        expect(result.edges).toHaveLength(99);
        expect(result.circularDependencies).toEqual([]);
        
        // Performance assertion (should be much faster than 100ms for 100 nodes)
        expect(duration).toBeLessThan(100);
      });

      it('should detect cycles efficiently in complex graphs', () => {
        // Arrange - Create a complex graph with multiple cycles
        const parsedClasses: ParsedClass[] = [];
        
        // Create multiple interconnected cycles
        // Cycle 1: A0 -> A1 -> A2 -> A0
        for (let i = 0; i < 3; i++) {
          const nextIndex = (i + 1) % 3;
          parsedClasses.push({
            name: `A${i}`,
            kind: 'service' as NodeKind,
            filePath: `/src/a${i}.service.ts`,
            dependencies: [{ token: `A${nextIndex}`, parameterName: 'dep' }]
          });
        }
        
        // Cycle 2: B0 -> B1 -> B2 -> B3 -> B0
        for (let i = 0; i < 4; i++) {
          const nextIndex = (i + 1) % 4;
          parsedClasses.push({
            name: `B${i}`,
            kind: 'service' as NodeKind,
            filePath: `/src/b${i}.service.ts`,
            dependencies: [{ token: `B${nextIndex}`, parameterName: 'dep' }]
          });
        }

        // Act & Assert
        const startTime = performance.now();
        const result = buildGraph(parsedClasses);
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Verify cycles detected
        expect(result.circularDependencies).toHaveLength(2);
        
        // Performance assertion (should be very fast for small complex graphs)
        expect(duration).toBeLessThan(50);
      });
    });
  });
});