import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'bun:test';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import type { Graph } from '../src/types';
import { JsonFormatter } from '../src/formatters/json-formatter';
import { MermaidFormatter } from '../src/formatters/mermaid-formatter';
import { OutputHandler } from '../src/core/output-handler';

describe('Output Formatting', () => {
  const sampleGraph: Graph = {
    nodes: [
      { id: 'TestService', kind: 'service' },
      { id: 'TestComponent', kind: 'component' },
      { id: 'AnotherService', kind: 'service' }
    ],
    edges: [
      { from: 'TestComponent', to: 'TestService', flags: {} },
      { from: 'TestComponent', to: 'AnotherService', flags: { optional: true } }
    ],
    circularDependencies: []
  };

  describe('JsonFormatter', () => {
    let formatter: JsonFormatter;

    beforeEach(() => {
      formatter = new JsonFormatter();
    });

    it('should output JSON format by default', () => {
      const result = formatter.format(sampleGraph);
      
      expect(() => JSON.parse(result)).not.toThrow();
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(sampleGraph);
    });

    it('should format JSON with proper indentation', () => {
      const result = formatter.format(sampleGraph);
      
      expect(result).toContain('  "nodes": [');
      expect(result).toContain('  "edges": [');
      expect(result).toContain('    {');
    });

    it('should handle empty graph', () => {
      const emptyGraph: Graph = { nodes: [], edges: [], circularDependencies: [] };
      const result = formatter.format(emptyGraph);
      
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(emptyGraph);
    });

    it('should preserve all graph properties', () => {
      const complexGraph: Graph = {
        nodes: [
          { id: 'ServiceA', kind: 'service' },
          { id: 'ComponentB', kind: 'component' }
        ],
        edges: [
          { 
            from: 'ComponentB', 
            to: 'ServiceA', 
            flags: { optional: true, self: false, skipSelf: true, host: false },
            isCircular: false 
          }
        ],
        circularDependencies: [['ServiceA', 'ComponentB']]
      };

      const result = formatter.format(complexGraph);
      const parsed = JSON.parse(result);
      
      expect(parsed).toEqual(complexGraph);
      expect(parsed.edges[0].flags).toEqual(complexGraph.edges[0].flags);
      expect(parsed.circularDependencies).toEqual(complexGraph.circularDependencies);
    });
  });

  describe('MermaidFormatter', () => {
    let formatter: MermaidFormatter;

    beforeEach(() => {
      formatter = new MermaidFormatter();
    });

    it('should output valid Mermaid flowchart syntax', () => {
      const result = formatter.format(sampleGraph);

      expect(result).toContain('flowchart LR');
      expect(result).toContain('TestComponent --> TestService');
      expect(result).toContain('TestComponent --> AnotherService');
    });

    it('should handle node names with special characters', () => {
      const specialGraph: Graph = {
        nodes: [
          { id: 'My-Service', kind: 'service' },
          { id: 'Component.With.Dots', kind: 'component' }
        ],
        edges: [
          { from: 'Component.With.Dots', to: 'My-Service', flags: {} }
        ],
        circularDependencies: []
      };

      const result = formatter.format(specialGraph);
      
      // Should escape or handle special characters
      expect(result).toContain('Component_With_Dots');
      expect(result).toContain('My_Service');
      expect(result).toContain('Component_With_Dots --> My_Service');
    });

    it('should include circular dependency annotations', () => {
      const circularGraph: Graph = {
        nodes: [
          { id: 'ServiceA', kind: 'service' },
          { id: 'ServiceB', kind: 'service' }
        ],
        edges: [
          { from: 'ServiceA', to: 'ServiceB', flags: {}, isCircular: true },
          { from: 'ServiceB', to: 'ServiceA', flags: {}, isCircular: true }
        ],
        circularDependencies: [['ServiceA', 'ServiceB']]
      };

      const result = formatter.format(circularGraph);
      
      expect(result).toContain('ServiceA -.->|circular| ServiceB');
      expect(result).toContain('ServiceB -.->|circular| ServiceA');
    });

    it('should handle empty graph gracefully', () => {
      const emptyGraph: Graph = { nodes: [], edges: [], circularDependencies: [] };
      const result = formatter.format(emptyGraph);

      expect(result).toContain('flowchart LR');
      expect(result).toContain('%% Empty graph');
    });

    it('should add circular dependency comments', () => {
      const circularGraph: Graph = {
        nodes: [
          { id: 'ServiceA', kind: 'service' },
          { id: 'ServiceB', kind: 'service' },
          { id: 'ServiceC', kind: 'service' }
        ],
        edges: [
          { from: 'ServiceA', to: 'ServiceB', flags: {} },
          { from: 'ServiceB', to: 'ServiceC', flags: {}, isCircular: true },
          { from: 'ServiceC', to: 'ServiceA', flags: {}, isCircular: true }
        ],
        circularDependencies: [['ServiceA', 'ServiceB', 'ServiceC']]
      };

      const result = formatter.format(circularGraph);
      
      expect(result).toContain('%% Circular Dependencies Detected:');
      expect(result).toContain('%% ServiceA -> ServiceB -> ServiceC -> ServiceA');
    });

    it('should sanitize complex special characters', () => {
      const complexGraph: Graph = {
        nodes: [
          { id: 'Service@123', kind: 'service' },
          { id: 'Component#Special$', kind: 'component' }
        ],
        edges: [
          { from: 'Component#Special$', to: 'Service@123', flags: {} }
        ],
        circularDependencies: []
      };

      const result = formatter.format(complexGraph);
      
      // Should remove all special characters except alphanumeric and underscore
      expect(result).toContain('ComponentSpecial');
      expect(result).toContain('Service123');
      expect(result).not.toContain('@');
      expect(result).not.toContain('#');
      expect(result).not.toContain('$');
    });

    describe('EdgeFlags JSON Serialization (TDD Cycle 1.2)', () => {
      let formatter: JsonFormatter;
      
      beforeEach(() => {
        formatter = new JsonFormatter();
      });

      it('should serialize all EdgeFlags types to JSON correctly', () => {
        // Arrange
        const graphWithAllFlags: Graph = {
          nodes: [
            { id: 'ComponentWithAllFlags', kind: 'component' },
            { id: 'ServiceWithAllFlags', kind: 'service' }
          ],
          edges: [
            {
              from: 'ComponentWithAllFlags',
              to: 'ServiceWithAllFlags',
              flags: {
                optional: true,
                self: false,
                skipSelf: true,
                host: false
              }
            }
          ],
          circularDependencies: []
        };

        // Act
        const result = formatter.format(graphWithAllFlags);

        // Assert
        const parsed = JSON.parse(result);
        expect(parsed.edges[0].flags).toEqual({
          optional: true,
          self: false,
          skipSelf: true,
          host: false
        });
      });

      it('should handle undefined flags in JSON serialization', () => {
        // Arrange
        const graphWithUndefinedFlags: Graph = {
          nodes: [
            { id: 'ComponentNoFlags', kind: 'component' },
            { id: 'ServiceNoFlags', kind: 'service' }
          ],
          edges: [
            {
              from: 'ComponentNoFlags',
              to: 'ServiceNoFlags'
              // Note: no flags property
            }
          ],
          circularDependencies: []
        };

        // Act
        const result = formatter.format(graphWithUndefinedFlags);

        // Assert
        const parsed = JSON.parse(result);
        expect(parsed.edges[0].flags).toBeUndefined();
      });

      it('should serialize empty flags object to JSON', () => {
        // Arrange
        const graphWithEmptyFlags: Graph = {
          nodes: [
            { id: 'ComponentEmptyFlags', kind: 'component' },
            { id: 'ServiceEmptyFlags', kind: 'service' }
          ],
          edges: [
            {
              from: 'ComponentEmptyFlags',
              to: 'ServiceEmptyFlags',
              flags: {}
            }
          ],
          circularDependencies: []
        };

        // Act
        const result = formatter.format(graphWithEmptyFlags);

        // Assert
        const parsed = JSON.parse(result);
        expect(parsed.edges[0].flags).toEqual({});
      });

      it('should serialize complex multi-edge flags correctly', () => {
        // Arrange
        const complexFlagsGraph: Graph = {
          nodes: [
            { id: 'MultiEdgeComponent', kind: 'component' },
            { id: 'ServiceA', kind: 'service' },
            { id: 'ServiceB', kind: 'service' },
            { id: 'ServiceC', kind: 'service' }
          ],
          edges: [
            {
              from: 'MultiEdgeComponent',
              to: 'ServiceA',
              flags: { optional: true }
            },
            {
              from: 'MultiEdgeComponent',
              to: 'ServiceB',
              flags: { self: true, skipSelf: false }
            },
            {
              from: 'MultiEdgeComponent',
              to: 'ServiceC'
              // No flags
            }
          ],
          circularDependencies: []
        };

        // Act
        const result = formatter.format(complexFlagsGraph);

        // Assert
        const parsed = JSON.parse(result);
        expect(parsed.edges).toHaveLength(3);
        expect(parsed.edges[0].flags).toEqual({ optional: true });
        expect(parsed.edges[1].flags).toEqual({ self: true, skipSelf: false });
        expect(parsed.edges[2].flags).toBeUndefined();
      });
    });
  });
});

describe('File Output Handling', () => {
  let outputHandler: OutputHandler;
  const tempDir = './tmp';

  beforeAll(() => {
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    outputHandler = new OutputHandler();
  });

  it('should write to stdout by default', async () => {
    const consoleSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const content = '{"test": "data"}';

    await outputHandler.writeOutput(content);

    expect(consoleSpy).toHaveBeenCalledWith(content);
    consoleSpy.mockRestore();
  });

  it('should write to file when path specified', async () => {
    const filePath = `${tempDir}/test-output.json`;
    const content = '{"test": "data"}';

    await outputHandler.writeOutput(content, filePath);

    expect(existsSync(filePath)).toBe(true);
    const fileContent = readFileSync(filePath, 'utf-8');
    expect(fileContent).toBe(content);
  });

  it('should create directories if they do not exist', async () => {
    const filePath = `${tempDir}/nested/dir/output.json`;
    const content = '{"test": "data"}';

    await outputHandler.writeOutput(content, filePath);

    expect(existsSync(filePath)).toBe(true);
    const fileContent = readFileSync(filePath, 'utf-8');
    expect(fileContent).toBe(content);
  });

  it('should handle file write errors gracefully', async () => {
    const invalidPath = '/root/cannot-write-here/output.json'; // Assuming no write permissions
    const content = '{"test": "data"}';

    await expect(outputHandler.writeOutput(content, invalidPath))
      .rejects.toThrow('Failed to write output file');
  });

  it('should write different content types correctly', async () => {
    const jsonContent = '{"nodes": [], "edges": [], "circularDependencies": []}';
    const mermaidContent = 'flowchart LR\n  %% Empty graph';
    
    const jsonPath = `${tempDir}/test.json`;
    const mermaidPath = `${tempDir}/test.mmd`;

    await outputHandler.writeOutput(jsonContent, jsonPath);
    await outputHandler.writeOutput(mermaidContent, mermaidPath);

    expect(readFileSync(jsonPath, 'utf-8')).toBe(jsonContent);
    expect(readFileSync(mermaidPath, 'utf-8')).toBe(mermaidContent);
  });

  it('should handle empty content', async () => {
    const filePath = `${tempDir}/empty.txt`;
    const content = '';

    await outputHandler.writeOutput(content, filePath);

    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, 'utf-8')).toBe('');
  });
});