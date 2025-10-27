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
  Type,
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
  StructuredWarnings,
  VerboseStats,
  Warning,
} from '../types';
import { CliError, ErrorHandler } from './error-handler';

export class AngularParser {
  private _project?: Project;
  private static _globalWarnedTypes = new Set<string>(); // Global tracking across all parser instances
  private _typeResolutionCache = new Map<string, string | null>();
  private _circularTypeRefs = new Set<string>();
  private _cacheHits = 0;
  private _cacheMisses = 0;
  private _structuredWarnings: StructuredWarnings = {
    categories: {
      typeResolution: [],
      skippedTypes: [],
      unresolvedImports: [],
      circularReferences: [],
      performance: [],
    },
    totalCount: 0,
  };

  constructor(private _options: CliOptions) {}

  /**
   * Reset global warning deduplication state (useful for testing)
   */
  static resetWarningState(): void {
    AngularParser._globalWarnedTypes.clear();
  }

  /**
   * Get structured warnings for analysis (Task 3.3)
   * Returns a copy of the structured warnings collected during parsing
   * @returns StructuredWarnings object with categorized warnings
   */
  getStructuredWarnings(): StructuredWarnings {
    return {
      categories: {
        typeResolution: [...this._structuredWarnings.categories.typeResolution],
        skippedTypes: [...this._structuredWarnings.categories.skippedTypes],
        unresolvedImports: [...this._structuredWarnings.categories.unresolvedImports],
        circularReferences: [...this._structuredWarnings.categories.circularReferences],
        performance: [...this._structuredWarnings.categories.performance],
      },
      totalCount: this._structuredWarnings.totalCount,
    };
  }

  /**
   * Add structured warning to collection (Task 3.3)
   * Includes global deduplication for both structured warnings and console output
   * @param category Warning category
   * @param warning Warning object
   */
  private addStructuredWarning(
    category: keyof StructuredWarnings['categories'],
    warning: Warning
  ): void {
    // Deduplicate using global warning tracking for both structured warnings and console output
    const warnKey = `${category}_${warning.type}_${warning.file}_${warning.message}`;
    if (!AngularParser._globalWarnedTypes.has(warnKey)) {
      // Add to structured warnings array (deduplicated)
      this._structuredWarnings.categories[category].push(warning);
      this._structuredWarnings.totalCount++;

      // Also output to console for immediate feedback
      const location = warning.line
        ? `${warning.file}:${warning.line}:${warning.column}`
        : warning.file;
      console.warn(`[${warning.severity.toUpperCase()}] ${warning.message} (${location})`);

      if (warning.suggestion && this._options.verbose) {
        console.warn(`  Suggestion: ${warning.suggestion}`);
      }

      AngularParser._globalWarnedTypes.add(warnKey);
    }
  }

  /**
   * Load TypeScript project using ts-morph
   * Implements FR-01 with error handling from PRD Section 13
   */
  loadProject(): void {
    // Validate tsconfig path exists
    if (!existsSync(this._options.project)) {
      throw ErrorHandler.createError(
        `tsconfig.json not found at: ${this._options.project}`,
        'TSCONFIG_NOT_FOUND',
        this._options.project
      );
    }

    try {
      // First, try to validate the JSON syntax by reading and parsing it
      try {
        const configContent = readFileSync(this._options.project, 'utf8');
        JSON.parse(configContent);
      } catch (jsonError) {
        const errorMessage = jsonError instanceof Error ? jsonError.message : String(jsonError);
        throw ErrorHandler.createError(
          `Invalid tsconfig.json: ${errorMessage}`,
          'TSCONFIG_INVALID',
          this._options.project
        );
      }

      // Load Project with ts-morph
      this._project = new Project({
        tsConfigFilePath: this._options.project,
      });

      // Validate project loaded successfully
      if (!this._project) {
        throw ErrorHandler.createError(
          'Failed to load TypeScript project',
          'PROJECT_LOAD_FAILED',
          this._options.project
        );
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

        throw ErrorHandler.createError(
          `TypeScript configuration error: ${message}`,
          'PROJECT_LOAD_FAILED',
          this._options.project,
          { diagnosticCount: diagnostics.length }
        );
      }
    } catch (error) {
      // Re-throw CliError instances
      if (error instanceof CliError) {
        throw error;
      }

      if (error instanceof Error) {
        // Handle different types of ts-morph/TypeScript errors
        if (
          error.message.includes('JSON') ||
          error.message.includes('Unexpected token') ||
          error.message.includes('expected')
        ) {
          throw ErrorHandler.createError(
            `Invalid tsconfig.json: ${error.message}`,
            'TSCONFIG_INVALID',
            this._options.project
          );
        }

        if (error.message.includes('TypeScript') || error.message.includes('Compiler option')) {
          throw ErrorHandler.createError(
            `TypeScript compilation failed: ${error.message}`,
            'COMPILATION_ERROR',
            this._options.project
          );
        }

        // Generic project loading failure
        throw ErrorHandler.createError(
          `Failed to load TypeScript project: ${error.message}`,
          'PROJECT_LOAD_FAILED',
          this._options.project
        );
      }

      // Unknown error type
      throw ErrorHandler.createError(
        'Failed to load TypeScript project due to unknown error',
        'PROJECT_LOAD_FAILED',
        this._options.project
      );
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
      throw ErrorHandler.createError(
        'Failed to load TypeScript project',
        'PROJECT_LOAD_FAILED',
        this._options.project
      );
    }

    const decoratedClasses: ParsedClass[] = [];
    const sourceFiles = this._project.getSourceFiles();
    let processedFiles = 0;
    let skippedFiles = 0;

    if (this._options.verbose) {
      console.log(`Processing ${sourceFiles.length} source files`);
    }

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();
      try {
        if (this._options.verbose) {
          console.log(`🔍 Parsing file: ${filePath}`);
        }

        const classes = sourceFile.getClasses();

        if (this._options.verbose) {
          console.log(`File: ${filePath}, Classes: ${classes.length}`);
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

        processedFiles++;
      } catch (error) {
        // Graceful error recovery: warn and continue with next file (FR-14)
        skippedFiles++;

        if (error instanceof CliError) {
          if (!error.isFatal()) {
            ErrorHandler.warn(error.message, filePath);
            continue;
          }
          throw error;
        }

        // Non-fatal file parsing error - continue processing
        ErrorHandler.warn(
          `Failed to parse file (skipping): ${error instanceof Error ? error.message : 'Unknown error'}`,
          filePath
        );
      }
    }

    if (this._options.verbose) {
      console.log(`✅ Processed ${processedFiles} files, skipped ${skippedFiles} files`);
    }

    if (decoratedClasses.length === 0) {
      ErrorHandler.warn('No decorated classes found in the project');
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
    // Clear circular reference tracking to prevent false positives across multiple class analyses
    this._circularTypeRefs.clear();

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
   * Check if type reference is circular (Task 3.3)
   * @param typeText Type text to check
   * @param typeNode TypeNode for context
   * @returns True if circular reference detected
   */
  private isCircularTypeReference(typeText: string, typeNode: TypeNode): boolean {
    // Basic circular reference detection
    const currentClass = typeNode.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
    if (currentClass) {
      const className = currentClass.getName();
      if (className === typeText) {
        return true;
      }
    }

    // Track type resolution chain
    if (this._circularTypeRefs.has(typeText)) {
      return true;
    }

    this._circularTypeRefs.add(typeText);
    return false;
  }

  /**
   * Check if type is generic (Task 3.3)
   * @param typeText Type text to check
   * @returns True if generic type
   */
  private isGenericType(typeText: string): boolean {
    return typeText.includes('<') && typeText.includes('>');
  }

  /**
   * Handle generic types (Task 3.3)
   * @param typeText Generic type text
   * @param filePath File path for context
   * @param lineNumber Line number
   * @param columnNumber Column number
   * @returns Token string or null
   */
  private handleGenericType(
    typeText: string,
    filePath: string,
    lineNumber: number,
    columnNumber: number
  ): string | null {
    if (this._options.verbose) {
      console.log(`Processing generic type: ${typeText}`);
    }

    // For now, return the full generic type
    // Future enhancement: could extract base type
    return typeText;
  }

  /**
   * Check if type is union type (Task 3.3)
   * @param typeText Type text to check
   * @returns True if union type
   */
  private isUnionType(typeText: string): boolean {
    return typeText.includes(' | ') && !typeText.includes('<');
  }

  /**
   * Handle union types (Task 3.3)
   * @param typeText Union type text
   * @param filePath File path for context
   * @param lineNumber Line number
   * @param columnNumber Column number
   * @returns Null (union types are skipped)
   */
  private handleUnionType(
    typeText: string,
    filePath: string,
    lineNumber: number,
    columnNumber: number
  ): string | null {
    this.addStructuredWarning('skippedTypes', {
      type: 'complex_union_type',
      message: `Skipping complex union type: ${typeText}`,
      file: filePath,
      line: lineNumber,
      column: columnNumber,
      suggestion: 'Consider using a single service type or interface',
      severity: 'info',
    });
    return null;
  }

  /**
   * Check if type can be resolved through imports (Task 3.3)
   * Handles module-scoped types (e.g., MyModule.ScopedService)
   * @param typeNode TypeNode to check
   * @returns True if type can be resolved
   */
  private canResolveType(typeNode: TypeNode): boolean {
    try {
      const sourceFile = typeNode.getSourceFile();
      const typeText = typeNode.getText();

      // First, check if the type itself is resolvable via TypeScript's type system
      const type = typeNode.getType();
      const typeTextFromSystem = type.getText();
      const symbol = type.getSymbol();

      // Check for error types first (unresolved imports/types show as 'error')
      if (typeTextFromSystem === 'error' || typeTextFromSystem === 'any' || type.isUnknown()) {
        return false;
      }

      // If no symbol and not a primitive, it's unresolved
      if (!symbol) {
        return false;
      }

      // Check if it's a known global type
      const globalTypes = ['Array', 'Promise', 'Observable', 'Date', 'Error'];
      if (globalTypes.includes(typeText)) {
        return true;
      }

      // Handle module-scoped types (e.g., MyModule.ScopedService)
      let simpleTypeText = typeText;
      if (typeText.includes('.')) {
        const parts = typeText.split('.');
        simpleTypeText = parts[0]; // Check if the namespace exists
      }

      // Check if type is imported
      const imports = sourceFile.getImportDeclarations();
      for (const importDecl of imports) {
        const namedImports = importDecl.getNamedImports();
        for (const namedImport of namedImports) {
          // Check both full type and simple type for module-scoped
          if (namedImport.getName() === typeText || namedImport.getName() === simpleTypeText) {
            return true;
          }
        }
      }

      // Check if type is declared in current file
      const typeAliases = sourceFile.getTypeAliases();
      const interfaces = sourceFile.getInterfaces();
      const classes = sourceFile.getClasses();

      // Check for both full type name and simple type
      const declared = [...typeAliases, ...interfaces, ...classes].some(
        (decl) => decl.getName() === typeText || decl.getName() === simpleTypeText
      );

      if (declared) {
        return true;
      }

      // Check for namespace declarations (for module-scoped types)
      if (typeText.includes('.')) {
        const namespaces = sourceFile.getModules();
        for (const namespace of namespaces) {
          if (namespace.getName() === simpleTypeText) {
            // Namespace exists, assume the nested type exists
            return true;
          }
        }
      }

      // If we reach here, the type wasn't found in imports, declarations, or namespaces
      // Even if we have a symbol, if we can't locate the declaration, treat it as unresolved
      // This prevents false positives for TypeScript error types that have symbols but are actually unresolved
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced type token extraction with advanced analysis (Task 3.3)
   * @param typeNode TypeNode to extract token from
   * @param filePath File path for context
   * @param lineNumber Line number
   * @param columnNumber Column number
   * @returns Token string or null
   */
  private extractTypeTokenEnhanced(
    typeNode: TypeNode,
    filePath: string,
    lineNumber: number,
    columnNumber: number
  ): string | null {
    const typeText = typeNode.getText();

    if (this._options.verbose) {
      console.log(
        `Type resolution steps: Processing '${typeText}' at ${filePath}:${lineNumber}:${columnNumber}`
      );
    }

    // Check for circular references
    if (this.isCircularTypeReference(typeText, typeNode)) {
      this.addStructuredWarning('circularReferences', {
        type: 'circular_type_reference',
        message: `Circular type reference detected: ${typeText}`,
        file: filePath,
        line: lineNumber,
        column: columnNumber,
        suggestion: 'Consider using interfaces or breaking the circular dependency',
        severity: 'warning',
      });
      return null;
    }

    // Handle generic types
    if (this.isGenericType(typeText)) {
      return this.handleGenericType(typeText, filePath, lineNumber, columnNumber);
    }

    // Handle union types
    if (this.isUnionType(typeText)) {
      return this.handleUnionType(typeText, filePath, lineNumber, columnNumber);
    }

    // Standard validation
    if (this.shouldSkipType(typeText)) {
      this.addStructuredWarning('skippedTypes', {
        type: 'any_unknown_type',
        message: `Skipping parameter with any/unknown type: ${typeText}`,
        file: filePath,
        line: lineNumber,
        column: columnNumber,
        suggestion: 'Consider adding explicit type annotation',
        severity: 'warning',
      });
      return null;
    }

    if (this.isPrimitiveType(typeText)) {
      this.addStructuredWarning('skippedTypes', {
        type: 'primitive_type',
        message: `Skipping primitive type: ${typeText}`,
        file: filePath,
        line: lineNumber,
        column: columnNumber,
        suggestion: 'Use dependency injection for services, not primitive types',
        severity: 'info',
      });
      return null;
    }

    // Validate type resolution
    if (!this.canResolveType(typeNode)) {
      this.addStructuredWarning('unresolvedImports', {
        type: 'unresolved_type',
        message: `Unresolved type '${typeText}' - check imports`,
        file: filePath,
        line: lineNumber,
        column: columnNumber,
        suggestion: `Ensure ${typeText} is properly imported`,
        severity: 'warning',
      });
      return null;
    }

    return typeText;
  }

  /**
   * Resolve inferred types with enhanced validation (Task 3.3)
   * @param type Type object from ts-morph
   * @param typeText Type text representation
   * @param param Parameter declaration for context
   * @param filePath File path for warnings
   * @param lineNumber Line number for warnings
   * @param columnNumber Column number for warnings
   * @returns Resolved token or null
   */
  private resolveInferredTypeEnhanced(
    type: Type,
    typeText: string,
    param: ParameterDeclaration,
    filePath: string,
    lineNumber: number,
    columnNumber: number
  ): string | null {
    if (this._options.verbose) {
      console.log(`Attempting to resolve inferred type: ${typeText}`);
    }

    // Try symbol-based resolution
    const symbol = type.getSymbol?.();
    if (symbol) {
      const symbolName = symbol.getName();
      if (symbolName && symbolName !== '__type') {
        return symbolName;
      }
    }

    // Try type alias resolution
    const aliasSymbol = type.getAliasSymbol?.();
    if (aliasSymbol) {
      // Check if the alias symbol actually has declarations (unresolved types don't)
      const declarations = aliasSymbol.getDeclarations();
      if (declarations && declarations.length > 0) {
        const aliasName = aliasSymbol.getName();
        return aliasName;
      }
    }

    // Standard validation with structured warnings
    // Deduplication is now handled by addStructuredWarning()
    if (this.shouldSkipType(typeText)) {
      this.addStructuredWarning('skippedTypes', {
        type: 'inferred_any_unknown',
        message: `Skipping parameter '${param.getName()}' with inferred any/unknown type`,
        file: filePath,
        line: lineNumber,
        column: columnNumber,
        suggestion: 'Add explicit type annotation to improve type safety',
        severity: 'warning',
      });
      return null;
    }

    if (this.isPrimitiveType(typeText)) {
      this.addStructuredWarning('skippedTypes', {
        type: 'inferred_primitive',
        message: `Skipping inferred primitive type parameter '${param.getName()}': ${typeText}`,
        file: filePath,
        line: lineNumber,
        column: columnNumber,
        suggestion: 'Use dependency injection for services, not primitive types',
        severity: 'info',
      });
      return null;
    }

    // Check if type is resolvable (has symbol or is a known global)
    // If no symbol and no valid alias symbol (with declarations), the type is unresolved (missing import)
    const aliasSymbolCheck = type.getAliasSymbol?.();
    const hasValidAliasSymbol = aliasSymbolCheck && aliasSymbolCheck.getDeclarations().length > 0;

    if (!symbol && !hasValidAliasSymbol) {
      this.addStructuredWarning('unresolvedImports', {
        type: 'unresolved_type',
        message: `Unresolved type '${typeText}' - check imports`,
        file: filePath,
        line: lineNumber,
        column: columnNumber,
        suggestion: `Ensure ${typeText} is properly imported`,
        severity: 'warning',
      });
      return null;
    }

    return typeText;
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
    const filePath = param.getSourceFile().getFilePath();
    const lineNumber = param.getStartLineNumber();
    const columnNumber = param.getStart() - param.getStartLinePos();

    // Performance tracking
    const startTime = performance.now();

    // Cache key for performance monitoring (needs to be in outer scope for finally block)
    let cacheKey: string | null = null;

    try {
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

      // Fall back to type annotation with enhanced validation (medium priority)
      const typeNode_check = param.getTypeNode();
      if (typeNode_check) {
        const token = this.extractTypeTokenEnhanced(
          typeNode_check,
          filePath,
          lineNumber,
          columnNumber
        );
        if (token) {
          return {
            token,
            flags,
            parameterName,
          };
        }
      }

      // Handle inferred types with caching (lowest priority)
      const type = param.getType();
      const typeText = type.getText(param);
      cacheKey = `${filePath}:${parameterName}:${typeText}`;

      // Check cache first
      if (this._typeResolutionCache.has(cacheKey)) {
        this._cacheHits++;
        const cachedResult = this._typeResolutionCache.get(cacheKey);

        if (this._options.verbose) {
          console.log(`Cache hit for parameter '${parameterName}': ${typeText}`);
        }

        return cachedResult ? { token: cachedResult, flags, parameterName } : null;
      }

      // Cache miss
      this._cacheMisses++;

      if (this._options.verbose) {
        console.log(`Cache miss for parameter '${parameterName}': ${typeText}`);
      }

      // Resolve and cache
      const resolvedToken = this.resolveInferredTypeEnhanced(
        type,
        typeText,
        param,
        filePath,
        lineNumber,
        columnNumber
      );

      this._typeResolutionCache.set(cacheKey, resolvedToken);

      if (resolvedToken) {
        return {
          token: resolvedToken,
          flags,
          parameterName,
        };
      }

      return null;
    } finally {
      // Performance monitoring (only for successfully resolved types)
      const duration = performance.now() - startTime;
      if (cacheKey && duration > 10) {
        // 10ms threshold
        // Only emit performance warning for successfully cached types (not null/skipped types)
        const cachedToken = this._typeResolutionCache.get(cacheKey);
        if (cachedToken) {
          this.addStructuredWarning('performance', {
            type: 'slow_type_resolution',
            message: `Slow type resolution for parameter '${parameterName}' (${duration.toFixed(2)}ms)`,
            file: filePath,
            line: lineNumber,
            column: columnNumber,
            suggestion: 'Consider adding explicit type annotation',
            severity: 'info',
          });
        }
      }
    }
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
