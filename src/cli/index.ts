#!/usr/bin/env node
/**
 * ng-di-graph CLI entry point
 * Supports both Node.js (via ts-node) and Bun native execution
 */
import { Command } from 'commander';
import { CliError, ErrorHandler } from '../core/error-handler';
import { buildGraph } from '../core/graph-builder';
import { filterGraph } from '../core/graph-filter';
import { LogCategory, createLogger } from '../core/logger';
import { OutputHandler } from '../core/output-handler';
import { AngularParser } from '../core/parser';
import { JsonFormatter } from '../formatters/json-formatter';
import { MermaidFormatter } from '../formatters/mermaid-formatter';
import type { CliOptions } from '../types';

const program = new Command();

program.name('ng-di-graph').description('Angular DI dependency graph CLI tool').version('0.1.0');

program
  .option('-p, --project <path>', 'tsconfig.json path', './tsconfig.json')
  .option('-f, --format <format>', 'output format: json | mermaid', 'json')
  .option('-e, --entry <symbol...>', 'starting nodes for sub-graph')
  .option('-d, --direction <dir>', 'filtering direction: upstream|downstream|both', 'downstream')
  .option('--include-decorators', 'include Optional/Self/SkipSelf/Host flags', false)
  .option('--out <file>', 'output file (stdout if omitted)')
  .option('-v, --verbose', 'show detailed parsing information', false);

program.action(async (options) => {
  try {
    // Validate direction option
    const validDirections = ['upstream', 'downstream', 'both'];
    if (options.direction && !validDirections.includes(options.direction)) {
      throw ErrorHandler.createError(
        `Invalid direction: ${options.direction}. Must be 'upstream', 'downstream', or 'both'`,
        'INVALID_ARGUMENTS'
      );
    }

    // Validate format option
    const validFormats = ['json', 'mermaid'];
    if (options.format && !validFormats.includes(options.format)) {
      throw ErrorHandler.createError(
        `Invalid format: ${options.format}. Must be 'json' or 'mermaid'`,
        'INVALID_ARGUMENTS'
      );
    }

    const cliOptions: CliOptions = {
      project: options.project,
      format: options.format as 'json' | 'mermaid',
      entry: options.entry,
      direction: options.direction as 'upstream' | 'downstream' | 'both',
      includeDecorators: options.includeDecorators,
      out: options.out,
      verbose: options.verbose,
    };

    // Create Logger when verbose mode is enabled
    const logger = createLogger(cliOptions.verbose);

    if (logger) {
      logger.time('total-execution');
      logger.info(LogCategory.FILE_PROCESSING, 'CLI execution started', {
        runtime: process.versions.bun ? 'Bun' : 'Node.js',
        version: process.versions.bun || process.versions.node,
        options: cliOptions,
      });
    }

    // Keep backward compatibility with console.log for user-facing output
    if (cliOptions.verbose) {
      console.log('🔧 CLI Options:', JSON.stringify(cliOptions, null, 2));
      console.log(
        `🚀 Running with ${process.versions.bun ? 'Bun' : 'Node.js'} ${process.versions.bun || process.versions.node}`
      );
    }

    // Initialize parser with logger
    const parser = new AngularParser(cliOptions, logger);

    if (cliOptions.verbose) {
      console.log('📂 Loading TypeScript project...');
    }

    // Load project
    parser.loadProject();

    if (cliOptions.verbose) {
      console.log('✅ Project loaded successfully');
    }

    // Parse Angular classes
    if (cliOptions.verbose) {
      console.log('🔍 Parsing Angular classes...');
    }

    const parsedClasses = await parser.parseClasses();

    if (cliOptions.verbose) {
      console.log(`✅ Found ${parsedClasses.length} decorated classes`);
    }

    // Build dependency graph with logger
    if (cliOptions.verbose) {
      console.log('🔗 Building dependency graph...');
    }

    let graph = buildGraph(parsedClasses, logger);

    if (cliOptions.verbose) {
      console.log(`✅ Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
      if (graph.circularDependencies.length > 0) {
        console.log(`⚠️  Detected ${graph.circularDependencies.length} circular dependencies`);
      }
    }

    // Apply entry point filtering if specified
    if (cliOptions.entry && cliOptions.entry.length > 0) {
      if (cliOptions.verbose) {
        console.log(`🔍 Filtering graph by entry points: ${cliOptions.entry.join(', ')}`);
      }

      graph = filterGraph(graph, cliOptions);

      if (cliOptions.verbose) {
        console.log(`✅ Filtered graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);
      }
    }

    // Format output with logger
    let formatter: JsonFormatter | MermaidFormatter;
    if (cliOptions.format === 'mermaid') {
      formatter = new MermaidFormatter(logger);
    } else {
      formatter = new JsonFormatter(logger);
    }

    const formattedOutput = formatter.format(graph);

    // Write output
    const outputHandler = new OutputHandler();
    await outputHandler.writeOutput(formattedOutput, cliOptions.out);

    if (cliOptions.verbose && cliOptions.out) {
      console.log(`✅ Output written to: ${cliOptions.out}`);
    }

    // Display performance summary
    if (logger) {
      const totalTime = logger.timeEnd('total-execution');
      const stats = logger.getStats();

      console.error('\n📊 Performance Summary:');
      console.error(`  Total time: ${totalTime.toFixed(2)}ms`);
      console.error(`  Peak memory: ${(stats.memoryUsage.peakUsage / 1024 / 1024).toFixed(2)}MB`);
      console.error(`  Total logs: ${stats.totalLogs}`);
    }
  } catch (error) {
    // Handle CliError instances with structured error handling
    if (error instanceof CliError) {
      ErrorHandler.handleError(error, options.verbose);
    } else if (error instanceof Error) {
      // Convert generic Error to CliError
      const cliError = ErrorHandler.createError(error.message, 'INTERNAL_ERROR', undefined, {
        originalError: error.name,
      });
      ErrorHandler.handleError(cliError, options.verbose);
    } else {
      // Handle unknown error types
      const cliError = ErrorHandler.createError(
        'An unexpected error occurred',
        'INTERNAL_ERROR',
        undefined,
        { error: String(error) }
      );
      ErrorHandler.handleError(cliError, options.verbose);
    }
  }
});

// Enhanced unhandled rejection handling
process.on('unhandledRejection', (reason, promise) => {
  const error = ErrorHandler.createError(
    `Unhandled promise rejection: ${reason}`,
    'INTERNAL_ERROR',
    undefined,
    { promise: String(promise) }
  );
  ErrorHandler.handleError(error, false);
});

// Enhanced uncaught exception handling
process.on('uncaughtException', (error) => {
  const cliError = ErrorHandler.createError(
    `Uncaught exception: ${error.message}`,
    'INTERNAL_ERROR',
    undefined,
    { stack: error.stack }
  );
  ErrorHandler.handleError(cliError, true);
});

// Parse command line arguments
program.parse();
