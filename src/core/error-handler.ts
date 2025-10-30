/**
 * Comprehensive error handling infrastructure for ng-di-graph CLI
 * Implements FR-10 requirements from PRD Section 13
 */

/**
 * Exit codes for ng-di-graph CLI
 * Implements PRD Section 13 error handling requirements
 */
export enum ExitCodes {
  SUCCESS = 0, // Successful execution
  GENERAL_ERROR = 1, // Generic error (uncaught exception)
  INVALID_ARGUMENTS = 2, // Invalid CLI arguments
  TSCONFIG_ERROR = 3, // tsconfig.json not found or invalid
  PARSING_ERROR = 4, // File parsing failure
  TYPE_RESOLUTION_ERROR = 5, // Type resolution failure
  MEMORY_ERROR = 6, // Memory limit exceeded
  FILE_NOT_FOUND = 7, // Required file not found
  PERMISSION_ERROR = 8, // Insufficient permissions
}

/**
 * Error codes for structured error handling
 * Each code maps to a specific error scenario
 */
export type ErrorCode =
  | 'TSCONFIG_NOT_FOUND' // tsconfig.json file not found
  | 'TSCONFIG_INVALID' // Invalid JSON or config
  | 'PROJECT_LOAD_FAILED' // ts-morph project loading failed
  | 'COMPILATION_ERROR' // TypeScript compilation errors
  | 'FILE_PARSE_ERROR' // Individual file parsing failed
  | 'TYPE_RESOLUTION_ERROR' // Cannot resolve dependency type
  | 'MEMORY_LIMIT_EXCEEDED' // Memory constraints exceeded
  | 'DEPENDENCY_NOT_FOUND' // Dependency cannot be resolved
  | 'ANONYMOUS_CLASS_SKIPPED' // Anonymous class encountered
  | 'INTERNAL_ERROR' // Unexpected internal error
  | 'INVALID_ARGUMENTS' // Invalid CLI arguments provided
  | 'FILE_NOT_FOUND' // Required file not found
  | 'PERMISSION_DENIED' // Insufficient file permissions
  | 'OUTPUT_WRITE_ERROR'; // Cannot write output file

/**
 * Custom error class for ng-di-graph CLI
 * Provides structured error information with context
 */
export class CliError extends Error {
  public readonly name = 'CliError';

  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly filePath?: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, CliError.prototype);
  }

  /**
   * Check if error is fatal (should exit immediately)
   */
  isFatal(): boolean {
    const fatalCodes: ErrorCode[] = [
      'TSCONFIG_NOT_FOUND',
      'TSCONFIG_INVALID',
      'PROJECT_LOAD_FAILED',
      'MEMORY_LIMIT_EXCEEDED',
      'INTERNAL_ERROR',
      'INVALID_ARGUMENTS',
      'PERMISSION_DENIED',
      'COMPILATION_ERROR',
    ];
    return fatalCodes.includes(this.code);
  }

  /**
   * Check if error is recoverable (can continue processing)
   */
  isRecoverable(): boolean {
    return !this.isFatal();
  }
}

/**
 * ErrorHandler - Static utility class for error handling
 * Provides centralized error formatting and exit code management
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Centralized error handling pattern
export class ErrorHandler {
  /**
   * Map error code to exit code
   * @param error CliError instance or null
   * @returns Exit code for process.exit()
   */
  static classifyExitCode(error: CliError | null): ExitCodes {
    if (!error) return ExitCodes.SUCCESS;

    switch (error.code) {
      case 'TSCONFIG_NOT_FOUND':
      case 'TSCONFIG_INVALID':
      case 'PROJECT_LOAD_FAILED':
        return ExitCodes.TSCONFIG_ERROR;

      case 'FILE_PARSE_ERROR':
      case 'COMPILATION_ERROR':
        return ExitCodes.PARSING_ERROR;

      case 'TYPE_RESOLUTION_ERROR':
      case 'DEPENDENCY_NOT_FOUND':
        return ExitCodes.TYPE_RESOLUTION_ERROR;

      case 'MEMORY_LIMIT_EXCEEDED':
        return ExitCodes.MEMORY_ERROR;

      case 'FILE_NOT_FOUND':
        return ExitCodes.FILE_NOT_FOUND;

      case 'PERMISSION_DENIED':
        return ExitCodes.PERMISSION_ERROR;

      case 'INVALID_ARGUMENTS':
        return ExitCodes.INVALID_ARGUMENTS;

      default:
        return ExitCodes.GENERAL_ERROR;
    }
  }

  /**
   * Format error for user-friendly display
   * @param error CliError to format
   * @param verbose Include stack traces and detailed info
   * @returns Formatted error message string
   */
  static formatError(error: CliError, verbose = false): string {
    const lines: string[] = [];

    // Error header with classification
    if (error.isFatal()) {
      lines.push('❌ Fatal Error');
    } else if (error.code === 'TYPE_RESOLUTION_ERROR') {
      lines.push('⚠️  Type Resolution Warning');
    } else {
      lines.push('⚠️  Warning');
    }

    // Main error message
    lines.push('');
    lines.push(`Message: ${error.message}`);

    // File context if available
    if (error.filePath) {
      lines.push(`File: ${error.filePath}`);
    }

    // Error code for debugging
    lines.push(`Code: ${error.code}`);

    // Additional context
    if (error.context && Object.keys(error.context).length > 0) {
      lines.push('');
      lines.push('Context:');
      for (const [key, value] of Object.entries(error.context)) {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    // Recovery guidance
    const guidance = ErrorHandler.getRecoveryGuidance(error);
    if (guidance) {
      lines.push('');
      lines.push('💡 Suggestions:');
      for (const line of guidance.split('\n')) {
        if (line.trim()) {
          lines.push(`  • ${line.trim()}`);
        }
      }
    }

    // Stack trace in verbose mode
    if (verbose && error.stack) {
      lines.push('');
      lines.push('🔍 Stack Trace:');
      lines.push(error.stack);
    }

    // Help reference
    lines.push('');
    lines.push('Run with --help for usage information');
    lines.push('Use --verbose for detailed debugging information');

    return lines.join('\n');
  }

  /**
   * Get actionable recovery guidance for error
   * @param error CliError to provide guidance for
   * @returns Multi-line guidance string
   */
  static getRecoveryGuidance(error: CliError): string {
    switch (error.code) {
      case 'TSCONFIG_NOT_FOUND':
        return `Check that the file path is correct
Ensure the tsconfig.json file exists
Try using an absolute path instead of relative
Use --project flag to specify correct path`;

      case 'TSCONFIG_INVALID':
        return `Validate JSON syntax with a JSON validator
Check TypeScript compiler options are valid
Ensure all referenced files exist
Try with a minimal tsconfig.json first`;

      case 'PROJECT_LOAD_FAILED':
        return `Check TypeScript compilation errors
Ensure all dependencies are installed
Verify import paths are correct
Try cleaning node_modules and reinstalling`;

      case 'FILE_PARSE_ERROR':
        return `Check TypeScript syntax in the problematic file
Ensure all imports are properly resolved
Try excluding the file from tsconfig if not needed
Use --verbose to see detailed parsing errors`;

      case 'TYPE_RESOLUTION_ERROR':
        return `Consider adding explicit type annotations
Check import statements are correct
Verify the dependency is properly exported
Use 'any' type as temporary workaround if needed`;

      case 'DEPENDENCY_NOT_FOUND':
        return `Check import statements in ${error.filePath || 'the file'}
Verify all dependencies are properly installed
Ensure the dependency is exported from its module
Consider using --verbose for detailed analysis`;

      case 'MEMORY_LIMIT_EXCEEDED':
        return `Try processing smaller portions of the codebase
Use --entry filtering to limit scope
Consider increasing available memory (NODE_OPTIONS="--max-old-space-size=4096")
Process files in batches rather than all at once`;

      case 'ANONYMOUS_CLASS_SKIPPED':
        return `Consider giving the class a name for better tracking
This is a non-fatal warning - processing will continue
Anonymous classes cannot be included in dependency graphs`;

      case 'OUTPUT_WRITE_ERROR':
        return `Check file permissions for the output location
Ensure the output directory exists
Try writing to a different location
Use stdout instead of file output as workaround`;

      case 'PERMISSION_DENIED':
        return `Check file and directory permissions
Try running with appropriate user privileges
Ensure you have read access to source files
Verify write access to output location`;

      case 'COMPILATION_ERROR':
        return `Fix TypeScript compilation errors
Check compiler options in tsconfig.json
Ensure all type definitions are available
Try running tsc directly to see detailed errors`;

      case 'INVALID_ARGUMENTS':
        return `Check CLI argument syntax
Review --help for valid options
Ensure all required arguments are provided
Verify argument values are in correct format`;

      case 'FILE_NOT_FOUND':
        return `Verify file path is correct
Check file exists in the specified location
Ensure file permissions allow reading
Try using absolute path instead of relative`;

      default:
        return `Review the error message for specific details
Try running with --verbose for more information
Check project configuration and dependencies
Consider filing an issue if the problem persists`;
    }
  }

  /**
   * Handle error and exit process (never returns)
   * @param error CliError to handle
   * @param verbose Include verbose error information
   */
  static handleError(error: CliError, verbose = false): never {
    const formattedError = ErrorHandler.formatError(error, verbose);
    console.error(formattedError);

    const exitCode = ErrorHandler.classifyExitCode(error);
    process.exit(exitCode);
  }

  /**
   * Factory method to create CliError
   * @param message Error message
   * @param code Error code
   * @param filePath Optional file path
   * @param context Optional context object
   * @returns CliError instance
   */
  static createError(
    message: string,
    code: ErrorCode,
    filePath?: string,
    context?: Record<string, unknown>
  ): CliError {
    return new CliError(message, code, filePath, context);
  }

  /**
   * Output warning without exiting
   * @param message Warning message
   * @param filePath Optional file path
   */
  static warn(message: string, filePath?: string): void {
    console.warn(`⚠️  Warning: ${message}${filePath ? ` (${filePath})` : ''}`);
  }
}
