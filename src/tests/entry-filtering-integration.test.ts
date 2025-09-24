import { describe, it, expect } from 'bun:test';
import { buildGraph } from '../core/graph-builder';
import { filterGraph } from '../core/graph-filter';
import type { ParsedClass, CliOptions } from '../types';

describe('Entry Filtering Integration', () => {
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

  it('should integrate graph building and filtering correctly', () => {
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

  it('should handle multiple entry points correctly', () => {
    const fullGraph = buildGraph(sampleParsedClasses);

    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['AppComponent', 'AdminComponent']
    };

    const filteredGraph = filterGraph(fullGraph, options);

    // Should include all nodes since both trees are included
    expect(filteredGraph.nodes).toHaveLength(6);
    expect(filteredGraph.edges).toHaveLength(4);
  });

  it('should return empty graph for non-existent entry points', () => {
    const fullGraph = buildGraph(sampleParsedClasses);

    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['NonExistentComponent']
    };

    const filteredGraph = filterGraph(fullGraph, options);

    expect(filteredGraph.nodes).toHaveLength(0);
    expect(filteredGraph.edges).toHaveLength(0);
    expect(filteredGraph.circularDependencies).toHaveLength(0);
  });

  it('should preserve edge flags during integration', () => {
    const classesWithFlags: ParsedClass[] = [
      {
        name: 'TestComponent',
        kind: 'component',
        filePath: '/src/test.component.ts',
        dependencies: [
          { 
            token: 'TestService', 
            parameterName: 'testService',
            flags: { optional: true, self: true }
          }
        ]
      },
      {
        name: 'TestService',
        kind: 'service',
        filePath: '/src/test.service.ts',
        dependencies: []
      }
    ];

    const fullGraph = buildGraph(classesWithFlags);
    
    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['TestComponent']
    };

    const filteredGraph = filterGraph(fullGraph, options);

    expect(filteredGraph.edges).toHaveLength(1);
    expect(filteredGraph.edges[0].flags).toEqual({ optional: true, self: true });
  });

  it('should preserve circular dependencies during filtering', () => {
    const circularClasses: ParsedClass[] = [
      {
        name: 'ServiceA',
        kind: 'service',
        filePath: '/src/service-a.ts',
        dependencies: [
          { token: 'ServiceB', parameterName: 'serviceB' }
        ]
      },
      {
        name: 'ServiceB',
        kind: 'service',
        filePath: '/src/service-b.ts',
        dependencies: [
          { token: 'ServiceA', parameterName: 'serviceA' }
        ]
      },
      {
        name: 'IsolatedService',
        kind: 'service',
        filePath: '/src/isolated.service.ts',
        dependencies: []
      }
    ];

    const fullGraph = buildGraph(circularClasses);
    expect(fullGraph.circularDependencies).toHaveLength(1);

    const options: CliOptions = {
      project: './tsconfig.json',
      format: 'json',
      direction: 'downstream',
      includeDecorators: false,
      verbose: false,
      entry: ['ServiceA']
    };

    const filteredGraph = filterGraph(fullGraph, options);

    // Should include ServiceA and ServiceB (circular), exclude IsolatedService
    expect(filteredGraph.nodes).toHaveLength(2);
    expect(filteredGraph.circularDependencies).toHaveLength(1);
    expect(filteredGraph.circularDependencies[0]).toEqual(['ServiceA', 'ServiceB', 'ServiceA']);
  });
});