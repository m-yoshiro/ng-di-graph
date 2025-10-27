/**
 * Comprehensive error handling tests
 * Tests FR-10 requirements from PRD Section 13
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CliError, ErrorCode, ExitCodes } from '../src/core/error-handler';

// These will be implemented in error-handler.ts
let CliErrorClass: any;
let ErrorHandlerClass: any;
let ExitCodesEnum: any;

// Dynamically import to avoid compile errors before implementation
try {
  const module = require('../src/core/error-handler');
  CliErrorClass = module.CliError;
  ErrorHandlerClass = module.ErrorHandler;
  ExitCodesEnum = module.ExitCodes;
} catch {
  // Module doesn't exist yet - tests will fail (RED phase)
}

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
      expect(ExitCodesEnum).toBeDefined();
      expect(ExitCodesEnum.SUCCESS).toBe(0);
    });

    it('should define GENERAL_ERROR as 1', () => {
      expect(ExitCodesEnum.GENERAL_ERROR).toBe(1);
    });

    it('should define INVALID_ARGUMENTS as 2', () => {
      expect(ExitCodesEnum.INVALID_ARGUMENTS).toBe(2);
    });

    it('should define TSCONFIG_ERROR as 3', () => {
      expect(ExitCodesEnum.TSCONFIG_ERROR).toBe(3);
    });

    it('should define PARSING_ERROR as 4', () => {
      expect(ExitCodesEnum.PARSING_ERROR).toBe(4);
    });

    it('should define TYPE_RESOLUTION_ERROR as 5', () => {
      expect(ExitCodesEnum.TYPE_RESOLUTION_ERROR).toBe(5);
    });

    it('should define MEMORY_ERROR as 6', () => {
      expect(ExitCodesEnum.MEMORY_ERROR).toBe(6);
    });

    it('should define FILE_NOT_FOUND as 7', () => {
      expect(ExitCodesEnum.FILE_NOT_FOUND).toBe(7);
    });

    it('should define PERMISSION_ERROR as 8', () => {
      expect(ExitCodesEnum.PERMISSION_ERROR).toBe(8);
    });
  });

  describe('CliError Class', () => {
    it('should create error with all properties', () => {
      const error = new CliErrorClass(
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
      const error = new CliErrorClass('Test', 'INTERNAL_ERROR' as ErrorCode);
      expect(error instanceof Error).toBe(true);
    });

    it('should create error without optional parameters', () => {
      const error = new CliErrorClass('Test message', 'INTERNAL_ERROR' as ErrorCode);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.filePath).toBeUndefined();
      expect(error.context).toBeUndefined();
    });

    it('should classify fatal errors correctly', () => {
      const fatalError = new CliErrorClass('Fatal', 'TSCONFIG_NOT_FOUND' as ErrorCode);
      expect(fatalError.isFatal()).toBe(true);
    });

    it('should classify recoverable errors correctly', () => {
      const recoverableError = new CliErrorClass('Recoverable', 'TYPE_RESOLUTION_ERROR' as ErrorCode);
      expect(recoverableError.isRecoverable()).toBe(true);
    });

    it('should have isRecoverable as inverse of isFatal', () => {
      const error = new CliErrorClass('Test', 'TSCONFIG_NOT_FOUND' as ErrorCode);
      expect(error.isFatal()).toBe(!error.isRecoverable());
    });
  });

  describe('Exit Code Classification', () => {
    it('should return SUCCESS for null error', () => {
      const result = ErrorHandlerClass.classifyExitCode(null);
      expect(result).toBe(ExitCodesEnum.SUCCESS);
    });

    it('should return TSCONFIG_ERROR for TSCONFIG_NOT_FOUND', () => {
      const error = new CliErrorClass('tsconfig.json not found', 'TSCONFIG_NOT_FOUND' as ErrorCode, '/invalid/path');
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.TSCONFIG_ERROR);
    });

    it('should return TSCONFIG_ERROR for TSCONFIG_INVALID', () => {
      const error = new CliErrorClass('Invalid tsconfig.json', 'TSCONFIG_INVALID' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.TSCONFIG_ERROR);
    });

    it('should return TSCONFIG_ERROR for PROJECT_LOAD_FAILED', () => {
      const error = new CliErrorClass('Project load failed', 'PROJECT_LOAD_FAILED' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.TSCONFIG_ERROR);
    });

    it('should return PARSING_ERROR for FILE_PARSE_ERROR', () => {
      const error = new CliErrorClass('Failed to parse file', 'FILE_PARSE_ERROR' as ErrorCode, '/app/component.ts');
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.PARSING_ERROR);
    });

    it('should return PARSING_ERROR for COMPILATION_ERROR', () => {
      const error = new CliErrorClass('Compilation error', 'COMPILATION_ERROR' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.PARSING_ERROR);
    });

    it('should return TYPE_RESOLUTION_ERROR for TYPE_RESOLUTION_ERROR', () => {
      const error = new CliErrorClass('Type resolution failed', 'TYPE_RESOLUTION_ERROR' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.TYPE_RESOLUTION_ERROR);
    });

    it('should return TYPE_RESOLUTION_ERROR for DEPENDENCY_NOT_FOUND', () => {
      const error = new CliErrorClass('Dependency not found', 'DEPENDENCY_NOT_FOUND' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.TYPE_RESOLUTION_ERROR);
    });

    it('should return MEMORY_ERROR for MEMORY_LIMIT_EXCEEDED', () => {
      const error = new CliErrorClass('Memory limit exceeded', 'MEMORY_LIMIT_EXCEEDED' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.MEMORY_ERROR);
    });

    it('should return FILE_NOT_FOUND for FILE_NOT_FOUND', () => {
      const error = new CliErrorClass('File not found', 'FILE_NOT_FOUND' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.FILE_NOT_FOUND);
    });

    it('should return PERMISSION_ERROR for PERMISSION_DENIED', () => {
      const error = new CliErrorClass('Permission denied', 'PERMISSION_DENIED' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.PERMISSION_ERROR);
    });

    it('should return INVALID_ARGUMENTS for INVALID_ARGUMENTS', () => {
      const error = new CliErrorClass('Invalid arguments', 'INVALID_ARGUMENTS' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.INVALID_ARGUMENTS);
    });

    it('should return GENERAL_ERROR for unknown error codes', () => {
      const error = new CliErrorClass('Unknown error', 'ANONYMOUS_CLASS_SKIPPED' as ErrorCode);
      const result = ErrorHandlerClass.classifyExitCode(error);
      expect(result).toBe(ExitCodesEnum.GENERAL_ERROR);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format fatal error with header and guidance', () => {
      const error = new CliErrorClass('tsconfig.json not found', 'TSCONFIG_NOT_FOUND' as ErrorCode, '/app/tsconfig.json');
      const formatted = ErrorHandlerClass.formatError(error, false);

      expect(formatted).toContain('❌ Fatal Error');
      expect(formatted).toContain('tsconfig.json not found');
      expect(formatted).toContain('File: /app/tsconfig.json');
      expect(formatted).toContain('Code: TSCONFIG_NOT_FOUND');
      expect(formatted).toContain('💡 Suggestions:');
      expect(formatted).toContain('--help');
    });

    it('should format warning for non-fatal errors', () => {
      const error = new CliErrorClass('Type resolution failed', 'TYPE_RESOLUTION_ERROR' as ErrorCode, '/app/service.ts');
      const formatted = ErrorHandlerClass.formatError(error, false);

      expect(formatted).toContain('⚠️');
      expect(formatted).toContain('Type resolution failed');
    });

    it('should include context when provided', () => {
      const error = new CliErrorClass(
        'Compilation error',
        'COMPILATION_ERROR' as ErrorCode,
        '/app/tsconfig.json',
        { diagnosticCount: 5 }
      );
      const formatted = ErrorHandlerClass.formatError(error, false);

      expect(formatted).toContain('Context:');
      expect(formatted).toContain('diagnosticCount');
    });

    it('should include stack trace in verbose mode', () => {
      const error = new CliErrorClass('Internal error', 'INTERNAL_ERROR' as ErrorCode);
      error.stack = 'Error\n  at test:1:1';
      const formatted = ErrorHandlerClass.formatError(error, true);

      expect(formatted).toContain('🔍 Stack Trace:');
      expect(formatted).toContain('Error\n  at test:1:1');
    });

    it('should not include stack trace in non-verbose mode', () => {
      const error = new CliErrorClass('Internal error', 'INTERNAL_ERROR' as ErrorCode);
      error.stack = 'Error\n  at test:1:1';
      const formatted = ErrorHandlerClass.formatError(error, false);

      expect(formatted).not.toContain('🔍 Stack Trace:');
    });
  });

  describe('Recovery Guidance', () => {
    it('should provide guidance for TSCONFIG_NOT_FOUND', () => {
      const error = new CliErrorClass('tsconfig not found', 'TSCONFIG_NOT_FOUND' as ErrorCode);
      const guidance = ErrorHandlerClass.getRecoveryGuidance(error);

      expect(guidance).toContain('Check that the file path is correct');
      expect(guidance).toContain('--project flag');
    });

    it('should provide guidance for MEMORY_LIMIT_EXCEEDED', () => {
      const error = new CliErrorClass('Memory exceeded', 'MEMORY_LIMIT_EXCEEDED' as ErrorCode);
      const guidance = ErrorHandlerClass.getRecoveryGuidance(error);

      expect(guidance).toContain('Try processing smaller portions');
      expect(guidance).toContain('--entry filtering');
      expect(guidance).toContain('increasing available memory');
    });

    it('should provide guidance for TYPE_RESOLUTION_ERROR', () => {
      const error = new CliErrorClass('Type resolution failed', 'TYPE_RESOLUTION_ERROR' as ErrorCode);
      const guidance = ErrorHandlerClass.getRecoveryGuidance(error);

      expect(guidance).toContain('type annotations');
      expect(guidance).toContain('import statements');
    });

    it('should include file path in guidance when available', () => {
      const error = new CliErrorClass('Dependency not found', 'DEPENDENCY_NOT_FOUND' as ErrorCode, '/app/service.ts');
      const guidance = ErrorHandlerClass.getRecoveryGuidance(error);

      expect(guidance).toContain('/app/service.ts');
    });
  });

  describe('ErrorHandler Helper Methods', () => {
    it('should create error via createError factory', () => {
      const error = ErrorHandlerClass.createError(
        'Test message',
        'INTERNAL_ERROR' as ErrorCode,
        '/test/file.ts',
        { test: true }
      );

      expect(error).toBeInstanceOf(CliErrorClass);
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.filePath).toBe('/test/file.ts');
      expect(error.context).toEqual({ test: true });
    });
  });
});
