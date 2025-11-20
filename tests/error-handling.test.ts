import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { CliError, ErrorHandler, ExitCodes, type ErrorCode } from '../src/core/error-handler';

describe('ErrorHandler - Exit Codes and Messages', () => {
  const testDir = './tmp/error-tests';

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('ExitCodes Enum', () => {
    it('should define SUCCESS as 0', () => {
      expect(ExitCodes).toBeDefined();
      expect(ExitCodes.SUCCESS).toBe(0);
    });

    it('should define GENERAL_ERROR as 1', () => {
      expect(ExitCodes.GENERAL_ERROR).toBe(1);
    });

    it('should define INVALID_ARGUMENTS as 2', () => {
      expect(ExitCodes.INVALID_ARGUMENTS).toBe(2);
    });

    it('should define TSCONFIG_ERROR as 3', () => {
      expect(ExitCodes.TSCONFIG_ERROR).toBe(3);
    });

    it('should define PARSING_ERROR as 4', () => {
      expect(ExitCodes.PARSING_ERROR).toBe(4);
    });

    it('should define TYPE_RESOLUTION_ERROR as 5', () => {
      expect(ExitCodes.TYPE_RESOLUTION_ERROR).toBe(5);
    });

    it('should define MEMORY_ERROR as 6', () => {
      expect(ExitCodes.MEMORY_ERROR).toBe(6);
    });

    it('should define FILE_NOT_FOUND as 7', () => {
      expect(ExitCodes.FILE_NOT_FOUND).toBe(7);
    });

    it('should define PERMISSION_ERROR as 8', () => {
      expect(ExitCodes.PERMISSION_ERROR).toBe(8);
    });
  });

  describe('CliError Class', () => {
    it('should create error with all properties', () => {
      const error = new CliError(
        'Test message',
        'INTERNAL_ERROR' as ErrorCode,
        '/test/path.ts',
        { detail: 'test context' }
      );

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.filePath).toBe('/test/path.ts');
      expect(error.context).toEqual({ detail: 'test context' });
      expect(error.name).toBe('CliError');
    });

    it('should be instanceof Error', () => {
      const error = new CliError('Test', 'INTERNAL_ERROR' as ErrorCode);
      expect(error instanceof Error).toBe(true);
    });

    it('should create error without optional parameters', () => {
      const error = new CliError('Test message', 'INTERNAL_ERROR' as ErrorCode);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.filePath).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it('should classify fatal errors correctly', () => {
      const fatalError = new CliError('Fatal', 'TSCONFIG_NOT_FOUND' as ErrorCode);
      expect(fatalError.isFatal()).toBe(true);
    });

    it('should classify recoverable errors correctly', () => {
      const recoverableError = new CliError('Recoverable', 'TYPE_RESOLUTION_ERROR' as ErrorCode);
      expect(recoverableError.isRecoverable()).toBe(true);
    });

    it('should have isRecoverable as inverse of isFatal', () => {
      const error = new CliError('Test', 'TSCONFIG_NOT_FOUND' as ErrorCode);
      expect(error.isFatal()).toBe(!error.isRecoverable());
    });
  });

  describe('Exit Code Classification', () => {
    it('should return SUCCESS for null error', () => {
      const result = ErrorHandler.classifyExitCode(null);
      expect(result).toBe(ExitCodes.SUCCESS);
    });

    it('should return TSCONFIG_ERROR for TSCONFIG_NOT_FOUND', () => {
      const error = new CliError('tsconfig.json not found', 'TSCONFIG_NOT_FOUND' as ErrorCode, '/invalid/path');
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.TSCONFIG_ERROR);
    });

    it('should return TSCONFIG_ERROR for TSCONFIG_INVALID', () => {
      const error = new CliError('Invalid tsconfig.json', 'TSCONFIG_INVALID' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.TSCONFIG_ERROR);
    });

    it('should return TSCONFIG_ERROR for PROJECT_LOAD_FAILED', () => {
      const error = new CliError('Project load failed', 'PROJECT_LOAD_FAILED' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.TSCONFIG_ERROR);
    });

    it('should return PARSING_ERROR for FILE_PARSE_ERROR', () => {
      const error = new CliError('Failed to parse file', 'FILE_PARSE_ERROR' as ErrorCode, '/app/component.ts');
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.PARSING_ERROR);
    });

    it('should return PARSING_ERROR for COMPILATION_ERROR', () => {
      const error = new CliError('Compilation error', 'COMPILATION_ERROR' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.PARSING_ERROR);
    });

    it('should return TYPE_RESOLUTION_ERROR for TYPE_RESOLUTION_ERROR', () => {
      const error = new CliError('Type resolution failed', 'TYPE_RESOLUTION_ERROR' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.TYPE_RESOLUTION_ERROR);
    });

    it('should return TYPE_RESOLUTION_ERROR for DEPENDENCY_NOT_FOUND', () => {
      const error = new CliError('Dependency not found', 'DEPENDENCY_NOT_FOUND' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.TYPE_RESOLUTION_ERROR);
    });

    it('should return MEMORY_ERROR for MEMORY_LIMIT_EXCEEDED', () => {
      const error = new CliError('Memory limit exceeded', 'MEMORY_LIMIT_EXCEEDED' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.MEMORY_ERROR);
    });

    it('should return FILE_NOT_FOUND for FILE_NOT_FOUND', () => {
      const error = new CliError('File not found', 'FILE_NOT_FOUND' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.FILE_NOT_FOUND);
    });

    it('should return PERMISSION_ERROR for PERMISSION_DENIED', () => {
      const error = new CliError('Permission denied', 'PERMISSION_DENIED' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.PERMISSION_ERROR);
    });

    it('should return INVALID_ARGUMENTS for INVALID_ARGUMENTS', () => {
      const error = new CliError('Invalid arguments', 'INVALID_ARGUMENTS' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.INVALID_ARGUMENTS);
    });

    it('should return GENERAL_ERROR for unknown error codes', () => {
      const error = new CliError('Unknown error', 'ANONYMOUS_CLASS_SKIPPED' as ErrorCode);
      const result = ErrorHandler.classifyExitCode(error);
      expect(result).toBe(ExitCodes.GENERAL_ERROR);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format fatal error with header and guidance', () => {
      const error = new CliError('tsconfig.json not found', 'TSCONFIG_NOT_FOUND' as ErrorCode, '/app/tsconfig.json');
      const formatted = ErrorHandler.formatError(error, false);

      expect(formatted).toContain('❌ Fatal Error');
      expect(formatted).toContain('tsconfig.json not found');
      expect(formatted).toContain('File: /app/tsconfig.json');
      expect(formatted).toContain('Code: TSCONFIG_NOT_FOUND');
      expect(formatted).toContain('💡 Suggestions:');
      expect(formatted).toContain('--help');
    });

    it('should format warning for non-fatal errors', () => {
      const error = new CliError('Type resolution failed', 'TYPE_RESOLUTION_ERROR' as ErrorCode, '/app/service.ts');
      const formatted = ErrorHandler.formatError(error, false);

      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('Type resolution failed');
    });

    it('should include context when provided', () => {
      const error = new CliError(
        'Compilation error',
        'COMPILATION_ERROR' as ErrorCode,
        '/app/tsconfig.json',
        { diagnosticCount: 5 }
      );
      const formatted = ErrorHandler.formatError(error, false);

      expect(formatted).toContain('Context:');
      expect(formatted).toContain('diagnosticCount');
    });

    it('should include stack trace in verbose mode', () => {
      const error = new CliError('Internal error', 'INTERNAL_ERROR' as ErrorCode);
      error.stack = 'Error\n  at test:1:1';
      const formatted = ErrorHandler.formatError(error, true);

      expect(formatted).toContain('🔍 Stack Trace:');
      expect(formatted).toContain('Error\n  at test:1:1');
    });

    it('should not include stack trace in non-verbose mode', () => {
      const error = new CliError('Internal error', 'INTERNAL_ERROR' as ErrorCode);
      error.stack = 'Error\n  at test:1:1';
      const formatted = ErrorHandler.formatError(error, false);

      expect(formatted).not.toContain('🔍 Stack Trace:');
    });
  });

  describe('Recovery Guidance', () => {
    it('should provide guidance for TSCONFIG_NOT_FOUND', () => {
      const error = new CliError('tsconfig not found', 'TSCONFIG_NOT_FOUND' as ErrorCode);
      const guidance = ErrorHandler.getRecoveryGuidance(error);

      expect(guidance).toContain('Check that the file path is correct');
      expect(guidance).toContain('--project flag');
    });

    it('should provide guidance for MEMORY_LIMIT_EXCEEDED', () => {
      const error = new CliError('Memory exceeded', 'MEMORY_LIMIT_EXCEEDED' as ErrorCode);
      const guidance = ErrorHandler.getRecoveryGuidance(error);

      expect(guidance).toContain('Try processing smaller portions');
      expect(guidance).toContain('--entry filtering');
      expect(guidance).toContain('increasing available memory');
    });

    it('should provide guidance for TYPE_RESOLUTION_ERROR', () => {
      const error = new CliError('Type resolution failed', 'TYPE_RESOLUTION_ERROR' as ErrorCode);
      const guidance = ErrorHandler.getRecoveryGuidance(error);

      expect(guidance).toContain('type annotations');
      expect(guidance).toContain('import statements');
    });

    it('should include file path in guidance when available', () => {
      const error = new CliError('Dependency not found', 'DEPENDENCY_NOT_FOUND' as ErrorCode, '/app/service.ts');
      const guidance = ErrorHandler.getRecoveryGuidance(error);

      expect(guidance).toContain('/app/service.ts');
    });
  });

  describe('ErrorHandler Helper Methods', () => {
    it('should create error via createError factory', () => {
      const error = ErrorHandler.createError(
        'Test message',
        'INTERNAL_ERROR' as ErrorCode,
        '/test/file.ts',
        { test: true }
      );

      expect(error).toBeInstanceOf(CliError);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.filePath).toBe('/test/file.ts');
      expect(error.context).toEqual({ test: true });
    });
  });
});
