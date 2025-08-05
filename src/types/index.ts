/**
 * Core TypeScript interfaces for ng-di-graph CLI tool
 * Based on PRD requirements in @docs/prd/mvp-requirements.md
 */

export type NodeKind = 'service' | 'component' | 'directive' | 'unknown';

export interface Node {
  id: string;
  kind: NodeKind;
}

export interface EdgeFlags {
  optional?: boolean;
  self?: boolean;
  skipSelf?: boolean;
  host?: boolean;
}

export interface Edge {
  from: string;
  to: string;
  flags?: EdgeFlags;
  isCircular?: boolean;
}

export interface Graph {
  nodes: Node[];
  edges: Edge[];
  circularDependencies: string[][];
}

export interface CliOptions {
  project: string;
  format: 'json' | 'mermaid';
  entry?: string[];
  direction: 'upstream' | 'downstream' | 'both';
  includeDecorators: boolean;
  out?: string;
  verbose: boolean;
}

export interface ParsedClass {
  name: string;
  kind: NodeKind;
  filePath: string;
  dependencies: ParsedDependency[];
}

export interface ParsedDependency {
  token: string;
  flags?: EdgeFlags;
  parameterName: string;
}

export interface ParserError extends Error {
  code: 'TSCONFIG_NOT_FOUND' | 'TSCONFIG_INVALID' | 'PROJECT_LOAD_FAILED' | 'COMPILATION_ERROR';
  filePath?: string;
}
