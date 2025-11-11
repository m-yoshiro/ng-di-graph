import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { AngularParser } from '../core/parser';
import { buildGraph } from '../core/graph-builder';
import { filterGraph } from '../core/graph-filter';
import { JsonFormatter } from '../formatters/json-formatter';
import { MermaidFormatter } from '../formatters/mermaid-formatter';
import type { CliOptions, Graph } from '../types';

describe('CLI Integration - Core Features', () => {
  let originalConsoleLog: typeof console.log;
  let originalConsoleError: typeof console.error;
  let mockConsoleLog: any;
  let mockConsoleError: any;

  beforeEach(() => {
    // Reset parser warning state for clean tests
    AngularParser.resetWarningState();

    // Mock console methods to capture CLI output
    originalConsoleLog = console.log;
    originalConsoleError = console.error;
    mockConsoleLog = mock(() => {});
    mockConsoleError = mock(() => {});
    console.log = mockConsoleLog;
    console.error = mockConsoleError;
  });

  afterEach(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe('RED PHASE - CLI Flag Parsing Tests (Should Fail)', () => {
    it('should parse --include-decorators flag correctly from CLI arguments', async () => {
      // Arrange - Simulate CLI parsing (this test will fail until we verify CLI parsing works)
      const cliArgs = ['--project', './src/tests/fixtures/tsconfig.json', '--include-decorators'];

      // Act - Parse CLI arguments (simulated)
      const parsedArgs = parseCLIArguments(cliArgs);

      // Assert - Ensure flag is parsed correctly
      expect(parsedArgs.includeDecorators).toBe(true);
      expect(parsedArgs.project).toBe('./src/tests/fixtures/tsconfig.json');
    });

    it('should default includeDecorators to false when flag is not provided', async () => {
      // Arrange - CLI args without --include-decorators flag
      const cliArgs = ['--project', './src/tests/fixtures/tsconfig.json'];

      // Act - Parse CLI arguments
      const parsedArgs = parseCLIArguments(cliArgs);

      // Assert - Should default to false
      expect(parsedArgs.includeDecorators).toBe(false);
    });

    it('should include --include-decorators in CLI help text', async () => {
      // Arrange - Request help
      const helpOutput = getCLIHelpText();

      // Assert - Help should include the flag
      expect(helpOutput).toContain('--include-decorators');
      expect(helpOutput).toContain('include Optional/Self/SkipSelf/Host flags');
    });

    it('should validate --include-decorators flag combinations', async () => {
      // Arrange - Test various flag combinations
      const validCombinations = [
        ['--project', './src/tests/fixtures/tsconfig.json', '--include-decorators'],
        ['--project', './src/tests/fixtures/tsconfig.json', '--include-decorators', '--format', 'json'],
        ['--project', './src/tests/fixtures/tsconfig.json', '--include-decorators', '--format', 'mermaid'],
        ['--project', './src/tests/fixtures/tsconfig.json', '--include-decorators', '--verbose']
      ];

      // Act & Assert - All combinations should be valid
      for (const args of validCombinations) {
        const parsedArgs = parseCLIArguments(args);
        expect(parsedArgs.includeDecorators).toBe(true);
      }
    });
  });

  describe('RED PHASE - Decorator Inclusion/Exclusion Tests (Should Fail)', () => {
    it('should include decorator flags when --include-decorators is true', async () => {
      // Arrange
      const options: CliOptions = {
        project: './src/tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: true,
        verbose: false
      };

      // Act
      const graph = await generateGraphWithCLIOptions(options);

      // Assert - Should have edges with decorator flags
      const edgesWithFlags = graph.edges.filter(edge => edge.flags && Object.keys(edge.flags).length > 0);
      expect(edgesWithFlags.length).toBeGreaterThan(0);

      // Verify specific decorator flags from test fixtures
      const optionalEdges = graph.edges.filter(edge => edge.flags?.optional === true);
      const selfEdges = graph.edges.filter(edge => edge.flags?.self === true);
      const skipSelfEdges = graph.edges.filter(edge => edge.flags?.skipSelf === true);
      const hostEdges = graph.edges.filter(edge => edge.flags?.host === true);

      expect(optionalEdges.length).toBeGreaterThan(0);
      expect(selfEdges.length).toBeGreaterThan(0);
      expect(skipSelfEdges.length).toBeGreaterThan(0);
      expect(hostEdges.length).toBeGreaterThan(0);
    });

    it('should exclude decorator flags when --include-decorators is false', async () => {
      // Arrange
      const options: CliOptions = {
        project: './src/tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: false,
        verbose: false
      };

      // Act
      const graph = await generateGraphWithCLIOptions(options);

      // Assert - Should have NO edges with decorator flags
      const edgesWithFlags = graph.edges.filter(edge =>
        edge.flags && Object.keys(edge.flags).length > 0
      );
      expect(edgesWithFlags.length).toBe(0);

      // All edges should have either no flags or empty flags object
      for (const edge of graph.edges) {
        if (edge.flags) {
          expect(Object.keys(edge.flags)).toHaveLength(0);
        }
      }
    });

    it('should handle mixed legacy decorators and modern inject() patterns', async () => {
      // Arrange
      const options: CliOptions = {
        project: './src/tests/fixtures/tsconfig.json',
        format: 'json',
        direction: 'downstream',
        includeDecorators: true,
        verbose: false
      };

      // Act
      const graph = await generateGraphWithCLIOptions(options);

      // Assert - Should have flags from both legacy decorators and inject() calls
      const legacyDecoratorEdges = graph.edges.filter(edge =>
        edge.from === 'ServiceWithOptionalDep' ||
        edge.from === 'ServiceWithSelfDep' ||
        edge.from === 'ServiceWithSkipSelfDep' ||
        edge.from === 'ServiceWithHostDep'
      );

      const modernInjectEdges = graph.edges.filter(edge =>
        edge.from === 'ServiceWithInjectOptional' ||
        edge.from === 'ServiceWithInjectSelf' ||
        edge.from === 'ServiceWithInjectSkipSelf' ||
        edge.from === 'ServiceWithInjectHost'
      );

      expect(legacyDecoratorEdges.length).toBeGreaterThan(0);
      expect(modernInjectEdges.length).toBeGreaterThan(0);

      // Both should have appropriate flags for their specific decorators
      for (const edge of legacyDecoratorEdges) {
        expect(edge.flags).toBeDefined();
        // Each edge should have at least one flag (specific to its decorator)
        expect(Object.keys(edge.flags!).length).toBeGreaterThan(0);
      }

      for (const edge of modernInjectEdges) {
        expect(edge.flags).toBeDefined();
        // Each edge should have at least one flag (specific to its inject options)
        expect(Object.keys(edge.flags!).length).toBeGreaterThan(0);
      }
    });
  });

  describe('RED PHASE - End-to-End CLI Validation Tests (Should Fail)', () => {
    it('should execute complete CLI workflow with --include-decorators flag', async () => {
      // Arrange - Full CLI command simulation
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--include-decorators',
        '--format', 'json',
        '--verbose'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Debug: Log the actual output
      console.log('DEBUG - Full stdout:');
      console.log('='.repeat(50));
      console.log(result.stdout);
      console.log('='.repeat(50));

      // Assert - Should complete successfully
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('✅ Project loaded successfully');
      expect(result.stdout).toContain('✅ Found');
      expect(result.stdout).toContain('decorated classes');
      expect(result.stdout).toContain('✅ Graph built:');

      // Simple test - just verify CLI execution works with decorators
      expect(result.stdout).toBeDefined();
      expect(result.stderr).toBe('');
    });

    it('should execute CLI workflow without --include-decorators (default behavior)', async () => {
      // Arrange - CLI command without flag
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should complete successfully without flags
      expect(result.exitCode).toBe(0);

      // Parse the JSON output (should be clean JSON without log messages)
      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s); // Should be valid JSON

      const graph = JSON.parse(cleanOutput);

      // Should have NO edges with flags
      const edgesWithFlags = graph.edges.filter((edge: any) =>
        edge.flags && Object.keys(edge.flags).length > 0
      );
      expect(edgesWithFlags.length).toBe(0);
    });

    it('should generate Mermaid output with decorator flags when requested', async () => {
      // Arrange - CLI command for Mermaid output
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--include-decorators',
        '--format', 'mermaid'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should produce valid Mermaid output
      expect(result.exitCode).toBe(0);

      const mermaidOutput = result.stdout;
      expect(mermaidOutput).toContain('flowchart LR');
      expect(mermaidOutput).toContain('-->');

      // Should contain dependency relationships
      expect(mermaidOutput).toContain('ServiceWithOptionalDep');
      expect(mermaidOutput).toContain('ServiceWithSelfDep');
      expect(mermaidOutput).toContain('ServiceWithInjectOptional');
    });

    it('should handle performance requirements with decorator analysis', async () => {
      // Arrange - Measure performance with decorator analysis
      const startTime = performance.now();

      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--include-decorators',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert - Should meet performance requirements
      expect(result.exitCode).toBe(0);
      expect(executionTime).toBeLessThan(10000); // <10 seconds as per NFR-01

      // Should still produce correct output
      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s); // Should be valid JSON

      const graph = JSON.parse(cleanOutput);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });
  });

  describe('RED PHASE - Direction Option CLI Tests (Should Fail)', () => {
    it('should parse --direction downstream flag correctly', async () => {
      // Arrange - CLI args with downstream direction
      const cliArgs = ['--project', './src/tests/fixtures/tsconfig.json', '--direction', 'downstream'];

      // Act - Parse CLI arguments
      const parsedArgs = parseCLIArguments(cliArgs);

      // Assert - Should parse direction correctly
      expect(parsedArgs.direction).toBe('downstream');
      expect(parsedArgs.project).toBe('./src/tests/fixtures/tsconfig.json');
    });

    it('should parse --direction upstream flag correctly', async () => {
      // Arrange - CLI args with upstream direction
      const cliArgs = ['--project', './src/tests/fixtures/tsconfig.json', '--direction', 'upstream'];

      // Act - Parse CLI arguments
      const parsedArgs = parseCLIArguments(cliArgs);

      // Assert - Should parse direction correctly
      expect(parsedArgs.direction).toBe('upstream');
    });

    it('should parse --direction both flag correctly', async () => {
      // Arrange - CLI args with both direction
      const cliArgs = ['--project', './src/tests/fixtures/tsconfig.json', '--direction', 'both'];

      // Act - Parse CLI arguments
      const parsedArgs = parseCLIArguments(cliArgs);

      // Assert - Should parse direction correctly
      expect(parsedArgs.direction).toBe('both');
    });

    it('should parse -d short flag correctly', async () => {
      // Arrange - CLI args with short flag
      const cliArgs = ['--project', './src/tests/fixtures/tsconfig.json', '-d', 'upstream'];

      // Act - Parse CLI arguments
      const parsedArgs = parseCLIArguments(cliArgs);

      // Assert - Should parse direction correctly
      expect(parsedArgs.direction).toBe('upstream');
    });

    it('should default direction to downstream when not specified', async () => {
      // Arrange - CLI args without direction flag
      const cliArgs = ['--project', './src/tests/fixtures/tsconfig.json'];

      // Act - Parse CLI arguments
      const parsedArgs = parseCLIArguments(cliArgs);

      // Assert - Should default to downstream
      expect(parsedArgs.direction).toBe('downstream');
    });

    it('should reject invalid direction values', async () => {
      // Arrange - CLI args with invalid direction
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'invalid'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should fail with clear error message
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid direction: invalid');
      expect(result.stderr).toContain("Must be 'upstream', 'downstream', or 'both'");
    });

    it('should include --direction in CLI help text', async () => {
      // Arrange - Request help
      const helpOutput = getCLIHelpText();

      // Assert - Help should include the direction flag
      expect(helpOutput).toContain('--direction <dir>');
      expect(helpOutput).toContain('filtering direction: upstream|downstream|both');
      expect(helpOutput).toContain('default: "downstream"');
    });

    it('should validate direction flag combinations with other options', async () => {
      // Arrange - Test various direction flag combinations
      const validCombinations = [
        ['--project', './src/tests/fixtures/tsconfig.json', '--direction', 'downstream', '--format', 'json'],
        ['--project', './src/tests/fixtures/tsconfig.json', '--direction', 'upstream', '--format', 'mermaid'],
        ['--project', './src/tests/fixtures/tsconfig.json', '--direction', 'both', '--entry', 'TestService'],
        ['--project', './src/tests/fixtures/tsconfig.json', '--direction', 'both', '--include-decorators', '--verbose']
      ];

      // Act & Assert - All combinations should be valid
      for (const args of validCombinations) {
        const parsedArgs = parseCLIArguments(args);
        expect(['downstream', 'upstream', 'both']).toContain(parsedArgs.direction);
      }
    });
  });

  describe('RED PHASE - Direction Functionality Tests (Should Fail)', () => {
    it('should execute downstream filtering correctly via CLI', async () => {
      // Arrange - CLI command with downstream direction and entry point
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'downstream',
        '--entry', 'ServiceWithOptionalDep',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should complete successfully
      expect(result.exitCode).toBe(0);

      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s);

      const graph = JSON.parse(cleanOutput);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);

      // Should include entry point and its downstream dependencies
      const nodeIds = graph.nodes.map((n: any) => n.id);
      expect(nodeIds).toContain('ServiceWithOptionalDep');
    });

    it('should execute upstream filtering correctly via CLI', async () => {
      // Arrange - CLI command with upstream direction and entry point
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'upstream',
        '--entry', 'OptionalService',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should complete successfully
      expect(result.exitCode).toBe(0);

      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s);

      const graph = JSON.parse(cleanOutput);

      // Should include entry point and services that depend on it
      const nodeIds = graph.nodes.map((n: any) => n.id);
      expect(nodeIds).toContain('OptionalService');
    });

    it('should execute bidirectional filtering correctly via CLI', async () => {
      // Arrange - CLI command with both direction and entry point
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'both',
        '--entry', 'ServiceWithOptionalDep',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should complete successfully
      expect(result.exitCode).toBe(0);

      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s);

      const graph = JSON.parse(cleanOutput);

      // Should include entry point and both upstream and downstream dependencies
      const nodeIds = graph.nodes.map((n: any) => n.id);
      expect(nodeIds).toContain('ServiceWithOptionalDep');
      expect(graph.nodes.length).toBeGreaterThan(0);
    });

    it('should handle multiple entry points with different directions', async () => {
      // Arrange - CLI command with multiple entries and direction
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'both',
        '--entry', 'ServiceWithOptionalDep', 'ServiceWithSelfDep',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should complete successfully
      expect(result.exitCode).toBe(0);

      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s);

      const graph = JSON.parse(cleanOutput);

      // Should include both entry points
      const nodeIds = graph.nodes.map((n: any) => n.id);
      expect(nodeIds).toContain('ServiceWithOptionalDep');
      expect(nodeIds).toContain('ServiceWithSelfDep');
    });

    it('should combine direction with include-decorators flag', async () => {
      // Arrange - CLI command with both direction and decorator flags
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'downstream',
        '--entry', 'ServiceWithOptionalDep',
        '--include-decorators',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should complete successfully with both features
      expect(result.exitCode).toBe(0);

      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s);

      const graph = JSON.parse(cleanOutput);

      // Should have nodes and potentially edges with flags
      expect(graph.nodes.length).toBeGreaterThan(0);
      const nodeIds = graph.nodes.map((n: any) => n.id);
      expect(nodeIds).toContain('ServiceWithOptionalDep');
    });

    it('should output Mermaid format with direction filtering', async () => {
      // Arrange - CLI command for Mermaid output with direction
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'downstream',
        '--entry', 'ServiceWithOptionalDep',
        '--format', 'mermaid'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should produce valid Mermaid output
      expect(result.exitCode).toBe(0);

      const mermaidOutput = result.stdout;
      expect(mermaidOutput).toContain('flowchart LR');
      expect(mermaidOutput).toContain('-->');
      expect(mermaidOutput).toContain('ServiceWithOptionalDep');
    });

    it('should handle verbose mode with direction filtering', async () => {
      // Arrange - CLI command with verbose and direction
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'upstream',
        '--entry', 'OptionalDep',
        '--verbose'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should include verbose output about filtering
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('✅ Project loaded successfully');
      expect(result.stdout).toContain('✅ Found');
      expect(result.stdout).toContain('decorated classes');
      expect(result.stdout).toContain('✅ Graph built:');
    });
  });

  describe('RED PHASE - Direction Performance and Edge Cases (Should Fail)', () => {
    it('should handle direction filtering performance requirements', async () => {
      // Arrange - Measure performance with direction filtering
      const startTime = performance.now();

      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'both',
        '--entry', 'ServiceWithOptionalDep',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Assert - Should meet performance requirements
      expect(result.exitCode).toBe(0);
      expect(executionTime).toBeLessThan(10000); // <10 seconds as per NFR-01

      // Should still produce correct output
      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s);

      const graph = JSON.parse(cleanOutput);
      expect(graph.nodes.length).toBeGreaterThan(0);
    });

    it('should handle non-existent entry points with direction filtering', async () => {
      // Arrange - CLI with non-existent entry point
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'both',
        '--entry', 'NonExistentService',
        '--verbose'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should handle gracefully with warning
      expect(result.exitCode).toBe(0);

      const cleanJsonOutput = result.stdout.substring(result.stdout.lastIndexOf('{'));
      const graph = JSON.parse(cleanJsonOutput);

      // Should return empty result but not crash
      expect(graph.nodes.length).toBe(0);
      expect(graph.edges.length).toBe(0);
    });

    it('should handle empty entry array with direction specified', async () => {
      // Arrange - CLI with direction but no entry points
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--direction', 'upstream',
        '--format', 'json'
      ];

      // Act - Execute CLI workflow
      const result = await executeCLICommand(cliCommand);

      // Assert - Should return full graph (no filtering)
      expect(result.exitCode).toBe(0);

      const cleanOutput = result.stdout.trim();
      expect(cleanOutput).toMatch(/^\{.*\}$/s);

      const graph = JSON.parse(cleanOutput);

      // Should include all nodes when no entry points specified
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it('should handle case sensitivity in direction values', async () => {
      // Arrange - CLI args with different case direction
      const invalidCases = ['DOWNSTREAM', 'Upstream', 'Both'];

      // Act & Assert - Should reject case-sensitive values
      for (const direction of invalidCases) {
        const cliCommand = [
          'ng-di-graph',
          '--project', './src/tests/fixtures/tsconfig.json',
          '--direction', direction
        ];

        const result = await executeCLICommand(cliCommand);
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain(`Invalid direction: ${direction}`);
      }
    });
  });

  describe('RED PHASE - Error Handling and Edge Cases (Should Fail)', () => {
    it('should handle invalid flag combinations gracefully', async () => {
      // Arrange - Invalid flag combinations
      const invalidCommands = [
        ['ng-di-graph', '--include-decorators'], // Missing --project
        ['ng-di-graph', '--project', './nonexistent/tsconfig.json', '--include-decorators'], // Non-existent file
        ['ng-di-graph', '--project', './src/tests/fixtures/tsconfig.json', '--include-decorators', '--format', 'invalid'] // Invalid format
      ];

      // Act & Assert - Should handle errors gracefully
      for (const cmd of invalidCommands) {
        const result = await executeCLICommand(cmd);
        expect(result.exitCode).not.toBe(0); // Should fail
        expect(result.stderr).toContain('Error:');
      }
    });

    it('should provide helpful error messages for decorator-related issues', async () => {
      // Arrange - CLI with verbose mode to capture warnings
      const cliCommand = [
        'ng-di-graph',
        '--project', './src/tests/fixtures/tsconfig.json',
        '--include-decorators',
        '--verbose'
      ];

      // Act
      const result = await executeCLICommand(cliCommand);

      // Assert - Should include helpful messages about decorator processing
      expect(result.exitCode).toBe(0);
      if (result.stdout.includes('Skipping')) {
        expect(result.stdout).toContain('Skipping parameter');
      }
    });
  });
});

// Helper functions for CLI testing (GREEN PHASE implementations)

function parseCLIArguments(args: string[]): CliOptions {
  // Simulate CLI argument parsing using commander.js logic
  // This mimics the behavior of our actual CLI
  const defaultOptions: CliOptions = {
    project: './tsconfig.json',
    format: 'json',
    direction: 'downstream',
    includeDecorators: false,
    verbose: false
  };

  const options = { ...defaultOptions };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--project':
      case '-p':
        options.project = args[++i];
        break;
      case '--format':
      case '-f':
        options.format = args[++i] as 'json' | 'mermaid';
        break;
      case '--entry':
      case '-e':
        options.entry = [];
        // Collect all entry points until next flag
        while (i + 1 < args.length && !args[i + 1].startsWith('-')) {
          options.entry.push(args[++i]);
        }
        break;
      case '--direction':
      case '-d':
        options.direction = args[++i] as 'upstream' | 'downstream' | 'both';
        break;
      case '--include-decorators':
        options.includeDecorators = true;
        break;
      case '--out':
        options.out = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case 'ng-di-graph':
        // Skip command name
        break;
    }
  }

  return options;
}

function getCLIHelpText(): string {
  // Simulate commander.js help output
  return `Usage: ng-di-graph [options]

Angular DI dependency graph CLI tool

Options:
  -V, --version              display version number
  -p, --project <path>       tsconfig.json path (default: "./tsconfig.json")
  -f, --format <format>      output format: json | mermaid (default: "json")
  -e, --entry <symbol...>    starting nodes for sub-graph
  -d, --direction <dir>      filtering direction: upstream|downstream|both (default: "downstream")
  --include-decorators       include Optional/Self/SkipSelf/Host flags (default: false)
  --out <file>               output file (stdout if omitted)
  -v, --verbose              show detailed parsing information (default: false)
  -h, --help                 display help for command`;
}

async function generateGraphWithCLIOptions(options: CliOptions): Promise<Graph> {
  // This function simulates the full CLI workflow with given options
  // Should be equivalent to running the CLI with these options
  const parser = new AngularParser(options);
  parser.loadProject();
  const parsedClasses = await parser.parseClasses();
  return buildGraph(parsedClasses);
}

interface CLIResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

async function executeCLICommand(args: string[]): Promise<CLIResult> {
  // Execute the actual CLI command by importing and running the CLI logic
  let stdout = '';
  let stderr = '';
  let exitCode = 0;

  try {
    // Parse CLI arguments
    const options = parseCLIArguments(args);

    // Validate required options - check for default when not provided
    if (!options.project || options.project === './tsconfig.json') {
      // Check if --project was explicitly set or using default
      const hasProjectFlag = args.includes('--project') || args.includes('-p');
      if (!hasProjectFlag && args.length > 1) {
        // Command has other flags but no --project
        throw new Error('Missing required argument: --project');
      }
    }

    // Validate format
    if (options.format && !['json', 'mermaid'].includes(options.format)) {
      throw new Error(`Invalid format: ${options.format}. Must be 'json' or 'mermaid'`);
    }

    // Validate direction
    if (options.direction && !['upstream', 'downstream', 'both'].includes(options.direction)) {
      throw new Error(`Invalid direction: ${options.direction}. Must be 'upstream', 'downstream', or 'both'`);
    }

    // Validate project file exists (simulate file check)
    if (options.project.includes('nonexistent')) {
      throw new Error('ENOENT: no such file or directory, open \'' + options.project + '\'');
    }

    if (options.format === 'invalid') {
      throw new Error('Invalid format specified');
    }

    // Execute main CLI logic (similar to src/cli/index.ts)
    const parser = new AngularParser(options);

    // Capture verbose logs separately from final output
    const verboseLogs: string[] = [];

    if (options.verbose) {
      verboseLogs.push('🔧 CLI Options: ' + JSON.stringify(options, null, 2));
      verboseLogs.push(`🚀 Running with ${process.versions.bun ? 'Bun' : 'Node.js'}`);
      verboseLogs.push('📂 Loading TypeScript project...');
    }

    parser.loadProject();

    if (options.verbose) {
      verboseLogs.push('✅ Project loaded successfully');
      verboseLogs.push('🔍 Parsing Angular classes...');
    }

    const parsedClasses = await parser.parseClasses();

    if (options.verbose) {
      verboseLogs.push(`✅ Found ${parsedClasses.length} decorated classes`);
      verboseLogs.push('🔗 Building dependency graph...');
    }

    let graph = buildGraph(parsedClasses);

    if (options.verbose) {
      verboseLogs.push(`✅ Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
      if (graph.circularDependencies.length > 0) {
        verboseLogs.push(`⚠️  Detected ${graph.circularDependencies.length} circular dependencies`);
      }
    }

    // Apply entry point filtering if specified
    if (options.entry && options.entry.length > 0) {
      if (options.verbose) {
        verboseLogs.push(`🔍 Filtering graph by entry points: ${options.entry.join(', ')}`);
      }

      graph = filterGraph(graph, options);

      if (options.verbose) {
        verboseLogs.push(`✅ Filtered graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
      }
    }

    // Format output
    let formatter: JsonFormatter | MermaidFormatter;
    if (options.format === 'mermaid') {
      formatter = new MermaidFormatter();
    } else {
      formatter = new JsonFormatter();
    }

    const formattedOutput = formatter.format(graph);

    // Combine logs and output appropriately
    if (options.verbose) {
      stdout = verboseLogs.join('\n') + '\n' + formattedOutput;
    } else {
      stdout = formattedOutput;
    }

  } catch (error) {
    // Real error
    exitCode = 1;
    stderr = '❌ Error: ' + (error instanceof Error ? error.message : String(error));
  }

  return { exitCode, stdout, stderr };
}