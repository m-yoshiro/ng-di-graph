import { existsSync, readFileSync } from 'node:fs';
/**
 * AngularParser - Core TypeScript AST parsing using ts-morph
 * Implements FR-01: ts-morph project loading with comprehensive error handling
 * Implements FR-02: Decorated class collection
 * Implements FR-03: Constructor token resolution
 */
import { Project, SyntaxKind } from 'ts-morph';
import type {
  CallExpression,
  ClassDeclaration,
  ConstructorDeclaration,
  Decorator,
  Node,
  ObjectLiteralExpression,
  ParameterDeclaration,
  PropertyAssignment,
  PropertyDeclaration,
  SourceFile,
  TypeNode,
} from 'ts-morph';
import type {
  CliOptions,
  EdgeFlags,
  NodeKind,
  ParameterAnalysisResult,
  ParsedClass,
  ParsedDependency,
  ParserError,
  VerboseStats,
} from '../types';

export class AngularParser {
  private _project?: Project;
  private static _globalWarnedTypes = new Set<string>(); // Global tracking across all parser instances

  constructor(private _options: CliOptions) {}

  /**
   * Reset global warning deduplication state (useful for testing)
   */
  static resetWarningState(): void {
    AngularParser._globalWarnedTypes.clear();
  }

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

    // FR-03: Extract constructor dependencies
    const dependencies = this.extractConstructorDependencies(classDeclaration);

    return {
      name: className,
      kind: nodeKind,
      filePath,
      dependencies,
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

  /**
   * Extract constructor dependencies from a class declaration
   * Implements FR-03: Constructor parameter analysis
   * Implements TDD Cycle 2.1: inject() function detection
   * @param classDeclaration ts-morph ClassDeclaration
   * @returns Array of parsed dependencies
   */
  private extractConstructorDependencies(classDeclaration: ClassDeclaration): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];
    const verboseStats = {
      decoratorCounts: { optional: 0, self: 0, skipSelf: 0, host: 0 },
      skippedDecorators: [] as Array<{ name: string; reason: string }>,
      parametersWithDecorators: 0,
      parametersWithoutDecorators: 0,
      legacyDecoratorsUsed: 0,
      injectPatternsUsed: 0,
      totalProcessingTime: 0,
      totalParameters: 0,
    };

    const startTime = performance.now();

    if (this._options.verbose && this._options.includeDecorators) {
      console.log('=== Decorator Analysis ===');
      const className = classDeclaration.getName() || 'unknown';
      console.log(`Analyzing decorators for class: ${className}`);
    }

    if (this._options.verbose && !this._options.includeDecorators) {
      console.log('Decorator analysis disabled - --include-decorators flag not set');
    }

    // Extract constructor parameter dependencies (legacy approach)
    const constructors = classDeclaration.getConstructors();
    if (constructors.length > 0) {
      // Take first constructor (Angular classes should have only one)
      const constructorDecl = constructors[0];
      const parameters = constructorDecl.getParameters();
      verboseStats.totalParameters = parameters.length;

      for (const param of parameters) {
        const paramStartTime = performance.now();
        const dependency = this.parseConstructorParameter(param);
        const paramEndTime = performance.now();

        if (dependency) {
          dependencies.push(dependency);

          // Collect verbose statistics
          if (this._options.verbose && this._options.includeDecorators) {
            this.collectVerboseStats(param, dependency, verboseStats);
          }
        }

        verboseStats.totalProcessingTime += paramEndTime - paramStartTime;
      }
    }

    // Extract inject() function dependencies (modern approach)
    const injectDependencies = this.extractInjectFunctionDependencies(classDeclaration);
    dependencies.push(...injectDependencies);

    const endTime = performance.now();
    verboseStats.totalProcessingTime = endTime - startTime;

    // Output verbose analysis if enabled
    if (this._options.verbose) {
      this.outputVerboseAnalysis(dependencies, verboseStats, classDeclaration);
    }

    return dependencies;
  }

  /**
   * Parse a single constructor parameter to extract dependency token
   * Implements FR-03 token resolution priority: @Inject > type annotation > inferred type
   * Implements FR-04 parameter decorator handling
   * @param param ts-morph ParameterDeclaration
   * @returns ParsedDependency if valid dependency, null if should be skipped
   */
  private parseConstructorParameter(param: ParameterDeclaration): ParsedDependency | null {
    const parameterName = param.getName();

    // Extract parameter decorators (FR-04)
    const flags = this.extractParameterDecorators(param);

    // Check for @Inject decorator first (highest priority)
    const injectDecorator = param.getDecorator('Inject');
    if (injectDecorator) {
      const token = this.extractInjectToken(injectDecorator);
      if (token) {
        return {
          token,
          flags,
          parameterName,
        };
      }
    }

    // Check for inject() function pattern (second priority)
    const initializer = param.getInitializer();
    if (initializer) {
      const injectResult = this.analyzeInjectCall(initializer);
      if (injectResult) {
        // If legacy decorators are present, they completely override inject() options
        // Otherwise, use inject() options
        const finalFlags = Object.keys(flags).length > 0 ? flags : injectResult.flags;
        return {
          token: injectResult.token,
          flags: finalFlags,
          parameterName,
        };
      }
    }

    // Fall back to type annotation (medium priority)
    const typeNode = param.getTypeNode();
    if (typeNode) {
      const token = this.extractTypeToken(typeNode);
      if (token) {
        return {
          token,
          flags,
          parameterName,
        };
      }
    }

    // Handle inferred types (lowest priority)
    const type = param.getType();
    const typeText = type.getText(param);

    if (this.shouldSkipType(typeText)) {
      const filePath = param.getSourceFile().getFilePath();
      const warnKey = `any_unknown_${filePath}_${parameterName}_${typeText}`;
      if (!AngularParser._globalWarnedTypes.has(warnKey)) {
        console.warn(`Skipping parameter '${parameterName}' with any/unknown type in ${filePath}`);
        AngularParser._globalWarnedTypes.add(warnKey);
      }
      return null;
    }

    if (this.isPrimitiveType(typeText)) {
      const filePath = param.getSourceFile().getFilePath();
      const warnKey = `primitive_${filePath}_${parameterName}_${typeText}`;
      if (!AngularParser._globalWarnedTypes.has(warnKey)) {
        console.warn(`Skipping primitive type parameter '${parameterName}': ${typeText}`);
        AngularParser._globalWarnedTypes.add(warnKey);
      }
      return null;
    }

    return {
      token: typeText,
      flags,
      parameterName,
    };
  }

  /**
   * Extract token from @Inject decorator
   * @param decorator @Inject decorator
   * @returns Token string or null
   */
  private extractInjectToken(decorator: Decorator): string | null {
    const callExpr = decorator.getCallExpression();
    if (!callExpr) return null;

    const args = callExpr.getArguments();
    if (args.length === 0) return null;

    const firstArg = args[0];
    return firstArg.getText().replace(/['"]/g, ''); // Remove quotes if string literal
  }

  /**
   * Extract token from type annotation
   * @param typeNode TypeScript type node
   * @returns Token string or null if should be skipped
   */
  private extractTypeToken(typeNode: TypeNode): string | null {
    const typeText = typeNode.getText();

    if (this.shouldSkipType(typeText)) {
      return null;
    }

    if (this.isPrimitiveType(typeText)) {
      return null;
    }

    return typeText;
  }

  /**
   * Check if type should be skipped (any/unknown types)
   * Implements FR-09: Skip dependencies whose type resolves to any/unknown
   * @param typeText Type text to check
   * @returns True if should be skipped
   */
  private shouldSkipType(typeText: string): boolean {
    const skipTypes = ['any', 'unknown', 'object', 'Object'];
    return skipTypes.includes(typeText);
  }

  /**
   * Check if type is primitive and should be skipped
   * @param typeText Type text to check
   * @returns True if primitive type
   */
  private isPrimitiveType(typeText: string): boolean {
    const primitives = ['string', 'number', 'boolean', 'symbol', 'bigint', 'undefined', 'null'];
    return primitives.includes(typeText);
  }

  /**
   * Extract parameter decorators from constructor parameter
   * Implements FR-04: Parameter decorator handling (@Optional, @Self, @SkipSelf, @Host)
   * Optimized for performance with early returns and minimal object allocation
   * @param param ts-morph ParameterDeclaration
   * @returns EdgeFlags object with detected decorators
   */
  private extractParameterDecorators(param: ParameterDeclaration): EdgeFlags {
    // Delegate to the new analyzeParameterDecorators method for consistency
    return this.analyzeParameterDecorators(param, this._options.includeDecorators);
  }

  /**
   * Extract dependencies from inject() function calls in class properties
   * Implements TDD Cycle 2.1: Modern Angular inject() pattern detection
   * @param classDeclaration ts-morph ClassDeclaration
   * @returns Array of parsed dependencies from inject() calls
   */
  private extractInjectFunctionDependencies(
    classDeclaration: ClassDeclaration
  ): ParsedDependency[] {
    const dependencies: ParsedDependency[] = [];

    try {
      // Get all property declarations in the class
      const properties = classDeclaration.getProperties();

      for (const property of properties) {
        const dependency = this.parseInjectProperty(property);
        if (dependency) {
          dependencies.push(dependency);
        }
      }
    } catch (error) {
      // Graceful error handling - don't break parsing for inject() issues
      if (this._options.verbose) {
        const className = classDeclaration.getName() || 'unknown';
        const filePath = classDeclaration.getSourceFile().getFilePath();
        console.warn(
          `Warning: Failed to extract inject() dependencies for class '${className}' in ${filePath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return dependencies;
  }

  /**
   * Parse a property declaration for inject() function calls
   * @param property ts-morph PropertyDeclaration
   * @returns ParsedDependency if inject() call found, null otherwise
   */
  private parseInjectProperty(property: PropertyDeclaration): ParsedDependency | null {
    try {
      const initializer = property.getInitializer();
      if (!initializer) {
        return null;
      }

      // Check if initializer is a call expression
      if (initializer.getKind() !== SyntaxKind.CallExpression) {
        return null;
      }

      const callExpression = initializer as CallExpression;
      const expression = callExpression.getExpression();

      // Check if the call is to the inject() function
      if (expression.getKind() !== SyntaxKind.Identifier) {
        return null;
      }

      const identifier = expression.getText();
      if (identifier !== 'inject') {
        return null;
      }

      // Additional validation: ensure inject is imported from @angular/core
      // This helps avoid false positives from other inject() functions
      if (!this.isAngularInjectImported(property.getSourceFile())) {
        return null;
      }

      // Extract token and options from inject() call
      const args = callExpression.getArguments();
      if (args.length === 0) {
        return null;
      }

      // First argument is the token
      const tokenArg = args[0];
      const token = tokenArg.getText().replace(/['"]/g, ''); // Remove quotes if string literal

      // Skip if token should be filtered out
      if (this.shouldSkipType(token) || this.isPrimitiveType(token)) {
        return null;
      }

      // Second argument is options object (optional)
      let flags: EdgeFlags = {};
      if (args.length > 1 && this._options.includeDecorators) {
        flags = this.parseInjectOptions(args[1]);
      }

      const propertyName = property.getName() || 'unknown';

      return {
        token,
        flags,
        parameterName: propertyName,
      };
    } catch (error) {
      // Graceful error handling
      if (this._options.verbose) {
        const propertyName = property.getName() || 'unknown';
        const filePath = property.getSourceFile().getFilePath();
        console.warn(
          `Warning: Failed to parse inject() property '${propertyName}' in ${filePath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      return null;
    }
  }

  /**
   * Parse options object from inject() function call
   * @param optionsArg Options argument from inject() call
   * @returns EdgeFlags object with parsed options
   */
  private parseInjectOptions(optionsArg: Node): EdgeFlags {
    const flags: EdgeFlags = {};

    try {
      if (optionsArg.getKind() !== SyntaxKind.ObjectLiteralExpression) {
        return flags;
      }

      const objectLiteral = optionsArg as ObjectLiteralExpression;
      const properties = objectLiteral.getProperties();

      // Cache for performance - avoid repeated string comparisons
      const supportedOptions = new Set(['optional', 'self', 'skipSelf', 'host']);

      for (const prop of properties) {
        if (prop.getKind() !== SyntaxKind.PropertyAssignment) {
          continue;
        }

        const propertyAssignment = prop as PropertyAssignment;
        const name = propertyAssignment.getName();

        // Only process known inject() options for performance
        if (!supportedOptions.has(name)) {
          // Warn about unknown options but continue processing
          if (this._options.verbose) {
            console.warn(`Unknown inject() option: '${name}' - ignoring`);
          }
          continue;
        }

        // Check if the property value is true (literal boolean)
        const initializer = propertyAssignment.getInitializer();
        if (initializer && initializer.getText() === 'true') {
          // Set flags based on known property names
          switch (name) {
            case 'optional':
              flags.optional = true;
              break;
            case 'self':
              flags.self = true;
              break;
            case 'skipSelf':
              flags.skipSelf = true;
              break;
            case 'host':
              flags.host = true;
              break;
          }
        }
      }
    } catch (error) {
      // Graceful error handling - return empty flags on error
      if (this._options.verbose) {
        console.warn(
          `Warning: Failed to parse inject() options: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return flags;
  }

  /**
   * Analyze parameter decorators for TDD Cycle 1.1
   * Legacy parameter decorator detection method for @Optional, @Self, @SkipSelf, @Host
   * @param parameter ParameterDeclaration to analyze
   * @param includeDecorators Whether to include decorators in analysis
   * @returns EdgeFlags object with detected decorators
   */
  private analyzeParameterDecorators(
    parameter: ParameterDeclaration,
    includeDecorators: boolean,
    verboseStats?: VerboseStats
  ): EdgeFlags {
    // Early return for disabled decorator detection
    if (!includeDecorators) {
      return {};
    }

    const decorators = parameter.getDecorators();

    // Early return if no decorators present
    if (decorators.length === 0) {
      return {};
    }

    const flags: EdgeFlags = {};

    try {
      // Cache for performance - avoid repeated name resolution
      const supportedDecorators = new Set(['Optional', 'Self', 'SkipSelf', 'Host']);

      for (const decorator of decorators) {
        const decoratorName = this.getDecoratorName(decorator);

        // Skip @Inject as it's handled separately for token extraction
        if (decoratorName === 'Inject') {
          continue;
        }

        // Only process known Angular DI decorators
        if (supportedDecorators.has(decoratorName)) {
          switch (decoratorName) {
            case 'Optional':
              flags.optional = true;
              break;
            case 'Self':
              flags.self = true;
              break;
            case 'SkipSelf':
              flags.skipSelf = true;
              break;
            case 'Host':
              flags.host = true;
              break;
          }
        } else if (decoratorName) {
          // Track unknown decorators for verbose stats
          if (verboseStats) {
            verboseStats.skippedDecorators.push({
              name: decoratorName,
              reason: 'Unknown or unsupported decorator',
            });
          }

          // Warn about unknown decorators to help with debugging
          console.warn(
            `Unknown or unsupported decorator: @${decoratorName}() - This decorator is not recognized as an Angular DI decorator and will be ignored.`
          );
        }
      }
    } catch (error) {
      // Graceful error handling - don't break parsing for decorator issues
      if (this._options.verbose) {
        const paramName = parameter.getName();
        const filePath = parameter.getSourceFile().getFilePath();
        console.warn(
          `Warning: Failed to extract decorators for parameter '${paramName}' in ${filePath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      // Return empty flags object on error
      return {};
    }

    return flags;
  }

  /**
   * Check if inject() function is imported from @angular/core
   * Prevents false positives from custom inject() functions
   * @param sourceFile Source file to check imports
   * @returns True if Angular inject is imported
   */
  private isAngularInjectImported(sourceFile: SourceFile): boolean {
    try {
      const importDeclarations = sourceFile.getImportDeclarations();

      for (const importDecl of importDeclarations) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();
        if (moduleSpecifier === '@angular/core') {
          const namedImports = importDecl.getNamedImports();

          for (const namedImport of namedImports) {
            const importName = namedImport.getName();
            const alias = namedImport.getAliasNode();

            // Check for direct import or aliased import
            if (importName === 'inject' || (alias && alias.getText() === 'inject')) {
              return true;
            }
          }
        }
      }

      return false;
    } catch (error) {
      // Conservative approach: assume it's valid if we can't determine
      if (this._options.verbose) {
        console.warn(
          `Warning: Could not verify inject() import in ${sourceFile.getFilePath()}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      return true; // Assume valid to avoid false negatives
    }
  }

  /**
   * Analyze inject() function call expression to extract token and options
   * Implements TDD Cycle 2.1 - Modern Angular inject() pattern support
   * @param expression Expression to analyze (should be a CallExpression)
   * @returns ParameterAnalysisResult or null if not a valid inject() call
   */
  private analyzeInjectCall(expression: Node | undefined): ParameterAnalysisResult | null {
    // Early return for missing expression
    if (!expression) {
      return null;
    }

    // Must be a CallExpression
    if (expression.getKind() !== SyntaxKind.CallExpression) {
      return null;
    }

    const callExpression = expression as CallExpression;

    try {
      // Verify it's actually an inject() call
      const callIdentifier = callExpression.getExpression();
      if (callIdentifier.getKind() !== SyntaxKind.Identifier) {
        return null;
      }

      const functionName = callIdentifier.getText();
      if (functionName !== 'inject') {
        return null;
      }

      // Verify inject is imported from @angular/core
      const sourceFile = expression.getSourceFile();
      if (!this.isAngularInjectImported(sourceFile)) {
        return null;
      }

      const args = callExpression.getArguments();
      if (args.length === 0) {
        // inject() called without arguments
        if (this._options.verbose) {
          console.warn('inject() called without token parameter - skipping');
        }
        return null;
      }

      // Extract token from first argument
      const tokenArg = args[0];
      let token: string;

      // Handle various token argument types with validation
      if (tokenArg.getKind() === SyntaxKind.StringLiteral) {
        // String token: inject('MY_TOKEN', ...)
        token = tokenArg.getText().slice(1, -1); // Remove quotes
        if (!token) {
          // Empty string token
          if (this._options.verbose) {
            console.warn('inject() called with empty string token - skipping');
          }
          return null;
        }
      } else if (tokenArg.getKind() === SyntaxKind.Identifier) {
        // Class token: inject(MyService, ...)
        token = tokenArg.getText();
        if (token === 'undefined' || token === 'null') {
          // Explicit undefined or null token
          if (this._options.verbose) {
            console.warn(`inject() called with ${token} token - skipping`);
          }
          return null;
        }
      } else if (tokenArg.getKind() === SyntaxKind.NullKeyword) {
        // Direct null literal
        if (this._options.verbose) {
          console.warn('inject() called with null token - skipping');
        }
        return null;
      } else {
        // Complex expression - use text representation
        token = tokenArg.getText();
        if (!token) {
          if (this._options.verbose) {
            console.warn('inject() called with invalid token expression - skipping');
          }
          return null;
        }
      }

      // Parse options from second argument if present
      let flags: EdgeFlags = {};
      if (args.length > 1 && this._options.includeDecorators) {
        const optionsArg = args[1];
        if (optionsArg.getKind() === SyntaxKind.ObjectLiteralExpression) {
          flags = this.parseInjectOptions(optionsArg);
        } else if (
          optionsArg.getKind() !== SyntaxKind.NullKeyword &&
          optionsArg.getKind() !== SyntaxKind.UndefinedKeyword
        ) {
          // Warn about invalid options (not null/undefined)
          if (this._options.verbose) {
            console.warn(
              `inject() called with invalid options type: ${optionsArg.getKindName()} - expected object literal`
            );
          }
        }
      }

      return {
        token,
        flags,
        source: 'inject',
      };
    } catch (error) {
      // Graceful error handling
      if (this._options.verbose) {
        const filePath = expression.getSourceFile().getFilePath();
        console.warn(
          `Warning: Failed to analyze inject() call in ${filePath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
      return null;
    }
  }

  /**
   * Collect verbose statistics for decorator analysis
   * @param param Parameter declaration being analyzed
   * @param dependency Parsed dependency result
   * @param verboseStats Statistics object to update
   */
  private collectVerboseStats(
    param: ParameterDeclaration,
    dependency: ParsedDependency,
    verboseStats: VerboseStats
  ): void {
    const paramName = param.getName();

    // Log individual parameter analysis
    console.log(`Parameter: ${paramName}`);
    console.log(`  Token: ${dependency.token}`);

    // Check if has flags
    const flagKeys = Object.keys(dependency.flags || {});
    if (flagKeys.length > 0) {
      verboseStats.parametersWithDecorators++;

      // Count individual decorator flags
      if (dependency.flags?.optional) verboseStats.decoratorCounts.optional++;
      if (dependency.flags?.self) verboseStats.decoratorCounts.self++;
      if (dependency.flags?.skipSelf) verboseStats.decoratorCounts.skipSelf++;
      if (dependency.flags?.host) verboseStats.decoratorCounts.host++;

      // Check for legacy decorators vs inject() patterns
      const decorators = param.getDecorators();
      let hasLegacyDecorators = false;
      let hasInjectPattern = false;

      // Re-analyze decorators to capture unknown ones for verbose stats
      this.analyzeParameterDecorators(param, true, verboseStats);

      for (const decorator of decorators) {
        const decoratorName = this.getDecoratorName(decorator);
        if (['Optional', 'Self', 'SkipSelf', 'Host'].includes(decoratorName)) {
          hasLegacyDecorators = true;
          console.log(`  Legacy decorator: @${decoratorName}`);
        }
      }

      // Check for inject() pattern
      const initializer = param.getInitializer();
      if (initializer && initializer.getKind() === SyntaxKind.CallExpression) {
        const callExpr = initializer as CallExpression;
        const expression = callExpr.getExpression();
        if (expression.getKind() === SyntaxKind.Identifier) {
          const funcName = expression.getText();
          if (funcName === 'inject') {
            hasInjectPattern = true;
            verboseStats.injectPatternsUsed++;
            const flagsStr = JSON.stringify(dependency.flags);
            console.log(`  inject() options: ${flagsStr}`);
          }
        }
      }

      if (hasLegacyDecorators) {
        verboseStats.legacyDecoratorsUsed++;

        // Check for precedence scenarios
        if (hasInjectPattern) {
          console.log('  Decorator Precedence Analysis');
          console.log('  Legacy decorators take precedence over inject() options');
          const appliedFlags = Object.keys(dependency.flags || {})
            .filter((key) => dependency.flags?.[key as keyof EdgeFlags] === true)
            .map((key) => `@${key.charAt(0).toUpperCase() + key.slice(1)}`)
            .join(', ');
          console.log(`  Applied: ${appliedFlags}`);

          // Try to detect what inject() options were overridden
          const injectResult = this.analyzeInjectCall(initializer);
          if (injectResult && Object.keys(injectResult.flags).length > 0) {
            const overriddenFlags = JSON.stringify(injectResult.flags);
            console.log(`  Overridden inject() options: ${overriddenFlags}`);
          }

          const finalFlags = JSON.stringify(dependency.flags);
          console.log(`  Final flags: ${finalFlags}`);
        }
      }
    } else {
      verboseStats.parametersWithoutDecorators++;
      console.log('  No decorators detected');
    }
  }

  /**
   * Output comprehensive verbose analysis summary
   * @param dependencies All parsed dependencies
   * @param verboseStats Collected statistics
   * @param classDeclaration Class being analyzed
   */
  private outputVerboseAnalysis(
    dependencies: ParsedDependency[],
    verboseStats: VerboseStats,
    classDeclaration: ClassDeclaration
  ): void {
    if (!this._options.verbose) return;

    if (this._options.includeDecorators) {
      // Decorator Statistics
      console.log('=== Decorator Statistics ===');
      console.log(
        `Total decorators detected: ${verboseStats.decoratorCounts.optional + verboseStats.decoratorCounts.self + verboseStats.decoratorCounts.skipSelf + verboseStats.decoratorCounts.host}`
      );

      if (verboseStats.decoratorCounts.optional > 0) {
        console.log(`@Optional: ${verboseStats.decoratorCounts.optional}`);
      }
      if (verboseStats.decoratorCounts.self > 0) {
        console.log(`@Self: ${verboseStats.decoratorCounts.self}`);
      }
      if (verboseStats.decoratorCounts.skipSelf > 0) {
        console.log(`@SkipSelf: ${verboseStats.decoratorCounts.skipSelf}`);
      }
      if (verboseStats.decoratorCounts.host > 0) {
        console.log(`@Host: ${verboseStats.decoratorCounts.host}`);
      }

      console.log(`Parameters with decorators: ${verboseStats.parametersWithDecorators}`);
      console.log(`Parameters without decorators: ${verboseStats.parametersWithoutDecorators}`);

      // inject() Pattern Analysis
      if (verboseStats.injectPatternsUsed > 0) {
        console.log('inject() Pattern Analysis');

        // Analyze inject() patterns in dependencies
        for (const dep of dependencies) {
          if (dep.parameterName) {
            const constructors = classDeclaration.getConstructors();
            if (constructors.length > 0) {
              const param = constructors[0]
                .getParameters()
                .find((p) => p.getName() === dep.parameterName);
              if (param) {
                const initializer = param.getInitializer();
                if (initializer) {
                  const injectResult = this.analyzeInjectCall(initializer);
                  if (injectResult) {
                    if (injectResult.token.startsWith('"') && injectResult.token.endsWith('"')) {
                      console.log(`String token: ${injectResult.token}`);
                    } else {
                      console.log(`Service token: ${injectResult.token}`);
                    }

                    if (Object.keys(injectResult.flags).length > 0) {
                      const flagsStr = JSON.stringify(injectResult.flags);
                      console.log(`inject() options detected: ${flagsStr}`);
                    } else {
                      console.log('inject() with no options');
                    }
                  }
                }
              }
            }
          }
        }
      }

      // Skipped Decorators (if any were captured)
      if (verboseStats.skippedDecorators.length > 0) {
        console.log('Skipped Decorators');
        for (const skipped of verboseStats.skippedDecorators) {
          console.log(`${skipped.name}`);
          console.log(`Reason: ${skipped.reason}`);
        }
        console.log(`Total skipped: ${verboseStats.skippedDecorators.length}`);
      }

      // Performance Metrics
      console.log('Performance Metrics');
      console.log(`Decorator processing time: ${verboseStats.totalProcessingTime.toFixed(2)}ms`);
      console.log(`Total parameters analyzed: ${verboseStats.totalParameters}`);
      if (verboseStats.totalParameters > 0) {
        const avgTime = verboseStats.totalProcessingTime / verboseStats.totalParameters;
        console.log(`Average time per parameter: ${avgTime.toFixed(3)}ms`);
      }

      // Analysis Summary
      console.log('=== Analysis Summary ===');
      console.log(`Total dependencies: ${dependencies.length}`);
      console.log(`With decorator flags: ${verboseStats.parametersWithDecorators}`);
      console.log(`Without decorator flags: ${verboseStats.parametersWithoutDecorators}`);
      console.log(`Legacy decorators used: ${verboseStats.legacyDecoratorsUsed}`);
      console.log(`inject() patterns used: ${verboseStats.injectPatternsUsed}`);

      if (verboseStats.skippedDecorators.length > 0) {
        console.log(`Unknown decorators skipped: ${verboseStats.skippedDecorators.length}`);
      }

      // Flags distribution
      if (verboseStats.parametersWithDecorators > 0) {
        console.log('Flags distribution:');
        if (verboseStats.decoratorCounts.optional > 0) {
          console.log(`optional: ${verboseStats.decoratorCounts.optional}`);
        }
        if (verboseStats.decoratorCounts.self > 0) {
          console.log(`self: ${verboseStats.decoratorCounts.self}`);
        }
        if (verboseStats.decoratorCounts.skipSelf > 0) {
          console.log(`skipSelf: ${verboseStats.decoratorCounts.skipSelf}`);
        }
        if (verboseStats.decoratorCounts.host > 0) {
          console.log(`host: ${verboseStats.decoratorCounts.host}`);
        }
      }
    }
  }
}
