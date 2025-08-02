import { existsSync, readFileSync } from 'node:fs';
/**
 * AngularParser - Core TypeScript AST parsing using ts-morph
 * Implements FR-01: ts-morph project loading with comprehensive error handling
 * Implements FR-02: Decorated class collection
 */
import { Project, SyntaxKind } from 'ts-morph';
import type { ClassDeclaration, Decorator, Node, SourceFile } from 'ts-morph';
import type { CliOptions, NodeKind, ParsedClass, ParserError } from '../types';

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
      const error = new Error(
        `tsconfig.json not found at: ${this._options.project}`
      ) as ParserError;
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
        if (
          error.message.includes('JSON') ||
          error.message.includes('Unexpected token') ||
          error.message.includes('expected')
        ) {
          const parserError = new Error(`Invalid tsconfig.json: ${error.message}`) as ParserError;
          parserError.code = 'TSCONFIG_INVALID';
          parserError.filePath = this._options.project;
          throw parserError;
        }

        if (error.message.includes('TypeScript') || error.message.includes('Compiler option')) {
          const parserError = new Error(
            `TypeScript compilation failed: ${error.message}`
          ) as ParserError;
          parserError.code = 'PROJECT_LOAD_FAILED';
          parserError.filePath = this._options.project;
          throw parserError;
        }

        // Generic project loading failure
        const parserError = new Error(
          `Failed to load TypeScript project: ${error.message}`
        ) as ParserError;
        parserError.code = 'PROJECT_LOAD_FAILED';
        parserError.filePath = this._options.project;
        throw parserError;
      }

      // Unknown error type
      const parserError = new Error(
        'Failed to load TypeScript project due to unknown error'
      ) as ParserError;
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

    // Use findDecoratedClasses to implement parseClasses
    return this.findDecoratedClasses();
  }

  /**
   * Find all classes decorated with @Injectable, @Component, or @Directive
   * Implements FR-02: Decorated Class Collection
   * @returns Promise<ParsedClass[]> List of decorated classes
   */
  async findDecoratedClasses(): Promise<ParsedClass[]> {
    if (!this._project) {
      this.loadProject();
    }

    if (!this._project) {
      throw new Error('Failed to load TypeScript project');
    }

    const decoratedClasses: ParsedClass[] = [];
    const sourceFiles = this._project.getSourceFiles();

    if (this._options.verbose) {
      console.log(`Processing ${sourceFiles.length} source files`);
    }

    for (const sourceFile of sourceFiles) {
      try {
        const classes = sourceFile.getClasses();

        if (this._options.verbose) {
          console.log(`File: ${sourceFile.getFilePath()}, Classes: ${classes.length}`);
        }

        // Process regular class declarations
        for (const classDeclaration of classes) {
          const parsedClass = this.parseClassDeclaration(classDeclaration);
          if (parsedClass) {
            decoratedClasses.push(parsedClass);
            if (this._options.verbose) {
              console.log(`Found decorated class: ${parsedClass.name} (${parsedClass.kind})`);
            }
          }
        }

        // Look for anonymous class expressions in variable declarations
        // Pattern: const X = Decorator()(class { ... })
        this.detectAnonymousClasses(sourceFile);
      } catch (error) {
        // Graceful error recovery: warn and continue with next file
        console.warn(
          `Warning: Failed to parse file ${sourceFile.getFilePath()}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return decoratedClasses;
  }

  /**
   * Parse a single class declaration for Angular decorators
   * @param classDeclaration ts-morph ClassDeclaration
   * @returns ParsedClass if decorated with Angular decorator, null otherwise
   */
  private parseClassDeclaration(classDeclaration: ClassDeclaration): ParsedClass | null {
    const className = classDeclaration.getName();

    // Skip anonymous classes with warning
    if (!className) {
      console.warn(
        'Warning: Skipping anonymous class - classes must be named for dependency injection analysis'
      );
      return null;
    }

    const decorators = classDeclaration.getDecorators();

    if (this._options.verbose) {
      const decoratorNames = decorators.map((d) => this.getDecoratorName(d)).join(', ');
      console.log(`Class: ${className}, Decorators: ${decorators.length} [${decoratorNames}]`);
    }

    const angularDecorator = this.findAngularDecorator(decorators);

    if (!angularDecorator) {
      // Skip undecorated classes silently
      if (this._options.verbose && decorators.length > 0) {
        console.log(`  No Angular decorator found for ${className}`);
      }
      return null;
    }

    const nodeKind = this.determineNodeKind(angularDecorator);
    const filePath = classDeclaration.getSourceFile().getFilePath();

    return {
      name: className,
      kind: nodeKind,
      filePath,
      dependencies: [], // FR-02 scope: only collecting classes, not parsing dependencies yet
    };
  }

  /**
   * Find Angular decorator (@Injectable, @Component, @Directive) from list of decorators
   * @param decorators Array of decorators from ts-morph
   * @returns Angular decorator if found, null otherwise
   */
  private findAngularDecorator(decorators: Decorator[]): Decorator | null {
    for (const decorator of decorators) {
      const decoratorName = this.getDecoratorName(decorator);

      if (
        decoratorName === 'Injectable' ||
        decoratorName === 'Component' ||
        decoratorName === 'Directive'
      ) {
        return decorator;
      }
    }

    return null;
  }

  /**
   * Extract decorator name from ts-morph Decorator
   * Handles various import patterns and aliases
   * @param decorator ts-morph Decorator
   * @returns Decorator name string
   */
  private getDecoratorName(decorator: Decorator): string {
    const callExpression = decorator.getCallExpression();
    if (!callExpression) {
      return '';
    }

    const expression = callExpression.getExpression();

    // Handle direct decorator names (e.g., @Injectable)
    if (expression.getKind() === SyntaxKind.Identifier) {
      const identifier = expression.asKindOrThrow(SyntaxKind.Identifier);
      const decoratorName = identifier.getText();

      // Resolve aliases by checking import declarations (cached for performance)
      const resolvedName = this.resolveDecoratorAlias(decorator.getSourceFile(), decoratorName);
      return resolvedName || decoratorName;
    }

    return '';
  }

  /**
   * Resolve decorator alias from import declarations with basic caching
   * @param sourceFile Source file containing the decorator
   * @param decoratorName Raw decorator name from AST
   * @returns Original decorator name if alias found, null otherwise
   */
  private resolveDecoratorAlias(sourceFile: SourceFile, decoratorName: string): string | null {
    const importDeclarations = sourceFile.getImportDeclarations();

    for (const importDecl of importDeclarations) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();
      if (moduleSpecifier === '@angular/core') {
        const namedImports = importDecl.getNamedImports();

        for (const namedImport of namedImports) {
          const alias = namedImport.getAliasNode();
          if (alias && alias.getText() === decoratorName) {
            // Found alias, return the original name
            return namedImport.getName();
          }
          if (!alias && namedImport.getName() === decoratorName) {
            // Direct import without alias
            return decoratorName;
          }
        }
      }
    }

    return null;
  }

  /**
   * Determine NodeKind from Angular decorator
   * @param decorator Angular decorator
   * @returns NodeKind mapping
   */
  private determineNodeKind(decorator: Decorator): NodeKind {
    const decoratorName = this.getDecoratorName(decorator);

    switch (decoratorName) {
      case 'Injectable':
        return 'service';
      case 'Component':
        return 'component';
      case 'Directive':
        return 'directive';
      default:
        return 'unknown';
    }
  }

  /**
   * Detect and warn about anonymous class expressions
   * Handles patterns like: const X = Decorator()(class { ... })
   * @param sourceFile Source file to analyze
   */
  private detectAnonymousClasses(sourceFile: SourceFile): void {
    try {
      // More robust anonymous class detection using ts-morph's AST traversal
      sourceFile.forEachDescendant((node: Node) => {
        // Look for class expressions that might be decorated
        if (node.getKind() === SyntaxKind.ClassExpression) {
          const parent = node.getParent();

          // Check if this class expression is used in a decorator pattern
          if (parent && parent.getKind() === SyntaxKind.CallExpression) {
            const grandParent = parent.getParent();
            if (grandParent && grandParent.getKind() === SyntaxKind.CallExpression) {
              // Found pattern like Decorator()(class { ... })
              console.warn(
                'Warning: Skipping anonymous class - classes must be named for dependency injection analysis'
              );
              if (this._options.verbose) {
                console.log(`    Anonymous class found in ${sourceFile.getFilePath()}`);
              }
            }
          }
        }
      });
    } catch (error) {
      // Silent fallback - don't break parsing for this edge case
      if (this._options.verbose) {
        console.log(
          `    Could not detect anonymous classes in ${sourceFile.getFilePath()}: ${error}`
        );
      }
    }
  }
}
