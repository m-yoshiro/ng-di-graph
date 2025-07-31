/**
 * AngularParser - Core TypeScript AST parsing using ts-morph
 * Implements FR-01: ts-morph project loading with comprehensive error handling
 */
import { Project } from 'ts-morph';
import { existsSync, readFileSync } from 'fs';
import { CliOptions, ParsedClass, ParserError } from '../types';

export class AngularParser {
  private _project?: Project;

  constructor(private _options: CliOptions) {}

  /**
   * Load TypeScript project using ts-morph
   * Implements FR-01 with error handling from PRD Section 13
   */
  loadProject(): void {
    // Validate tsconfig path exists
    if (!existsSync(this._options.project)) {
      const error = new Error(`tsconfig.json not found at: ${this._options.project}`) as ParserError;
      error.code = 'TSCONFIG_NOT_FOUND';
      error.filePath = this._options.project;
      throw error;
    }

    try {
      // First, try to validate the JSON syntax by reading and parsing it
      try {
        const configContent = readFileSync(this._options.project, 'utf8');
        JSON.parse(configContent);
      } catch (jsonError) {
        const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
        const parserError = new Error(`Invalid tsconfig.json: ${errorMessage}`) as ParserError;
        parserError.code = 'TSCONFIG_INVALID';
        parserError.filePath = this._options.project;
        throw parserError;
      }

      // Load Project with ts-morph
      this._project = new Project({
        tsConfigFilePath: this._options.project,
      });

      // Validate project loaded successfully
      if (!this._project) {
        const error = new Error('Failed to load TypeScript project') as ParserError;
        error.code = 'PROJECT_LOAD_FAILED';
        throw error;
      }

      // Basic validation - try to get source files to ensure project is valid
      // This will catch TypeScript compilation/configuration errors
      this._project.getSourceFiles();
      
      // Additional validation for compiler options
      const program = this._project.getProgram();
      const diagnostics = program.getConfigFileParsingDiagnostics();
      
      if (diagnostics.length > 0) {
        const firstDiagnostic = diagnostics[0];
        const message = firstDiagnostic.getMessageText();
        
        const parserError = new Error(`TypeScript configuration error: ${message}`) as ParserError;
        parserError.code = 'PROJECT_LOAD_FAILED';
        parserError.filePath = this._options.project;
        throw parserError;
      }

    } catch (error) {
      if (error instanceof Error) {
        // Check if it's already a ParserError
        if ('code' in error) {
          throw error;
        }

        // Handle different types of ts-morph/TypeScript errors
        if (error.message.includes('JSON') || error.message.includes('Unexpected token') || error.message.includes('expected')) {
          const parserError = new Error(`Invalid tsconfig.json: ${error.message}`) as ParserError;
          parserError.code = 'TSCONFIG_INVALID';
          parserError.filePath = this._options.project;
          throw parserError;
        }

        if (error.message.includes('TypeScript') || error.message.includes('Compiler option')) {
          const parserError = new Error(`TypeScript compilation failed: ${error.message}`) as ParserError;
          parserError.code = 'PROJECT_LOAD_FAILED';
          parserError.filePath = this._options.project;
          throw parserError;
        }

        // Generic project loading failure
        const parserError = new Error(`Failed to load TypeScript project: ${error.message}`) as ParserError;
        parserError.code = 'PROJECT_LOAD_FAILED';
        parserError.filePath = this._options.project;
        throw parserError;
      }

      // Unknown error type
      const parserError = new Error('Failed to load TypeScript project due to unknown error') as ParserError;
      parserError.code = 'PROJECT_LOAD_FAILED';
      throw parserError;
    }
  }

  /**
   * Get the loaded ts-morph Project instance
   * @returns Project instance
   * @throws Error if project not loaded
   */
  getProject(): Project {
    if (!this._project) {
      throw new Error('Project not loaded. Call loadProject() first.');
    }
    return this._project;
  }

  /**
   * Parse decorated classes from the loaded project
   * Auto-loads project if not already loaded
   * @returns Promise of parsed class information
   */
  async parseClasses(): Promise<ParsedClass[]> {
    if (!this._project) {
      this.loadProject();
    }
    
    // Not implemented yet - will be implemented in FR-02
    throw new Error('Not implemented yet');
  }
}