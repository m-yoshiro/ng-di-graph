#!/usr/bin/env node
/**
 * ng-di-graph CLI entry point
 * Supports both Node.js (via ts-node) and Bun native execution
 */
import { Command } from 'commander';
import { AngularParser } from '../core/parser';
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
    const cliOptions: CliOptions = {
      project: options.project,
      format: options.format as 'json' | 'mermaid',
      entry: options.entry,
      direction: options.direction as 'upstream' | 'downstream' | 'both',
      includeDecorators: options.includeDecorators,
      out: options.out,
      verbose: options.verbose,
    };

    if (cliOptions.verbose) {
      console.log('🔧 CLI Options:', JSON.stringify(cliOptions, null, 2));
      console.log(
        `🚀 Running with ${process.versions.bun ? 'Bun' : 'Node.js'} ${process.versions.bun || process.versions.node}`
      );
    }

    // Initialize parser
    const parser = new AngularParser(cliOptions);

    if (cliOptions.verbose) {
      console.log('📂 Loading TypeScript project...');
    }

    // Load project
    parser.loadProject();

    if (cliOptions.verbose) {
      console.log('✅ Project loaded successfully');
    }

    // For now, just show that we can load the project
    // Full implementation will come in later tasks
    const project = parser.getProject();
    const sourceFiles = project.getSourceFiles();

    console.log(`Found ${sourceFiles.length} source files in the project`);
    console.log('🚧 Full parsing implementation coming soon...');
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Error:', error.message);
      if (options.verbose && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    } else {
      console.error('❌ Unknown error:', error);
    }
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();
