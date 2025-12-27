import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import * as ts from 'typescript';
import { ErrorHandler } from '../core/error-handler';
import { LogCategory, type Logger } from '../core/logger';

const TSCONFIG_NAME = 'tsconfig.json';
const WORKSPACE_FILES = ['angular.json', 'workspace.json'];
const WORKSPACE_TARGET_ORDER = ['build', 'test', 'serve', 'lint', 'e2e'];

type ProjectResolutionOptions = {
  projectOption?: string;
  fileTargets: string[];
  cwd: string;
  logger?: Logger;
};

type WorkspaceResolution = {
  workspacePath: string;
  tsconfigPath: string;
};

export function resolveProjectPath(options: ProjectResolutionOptions): string {
  const { projectOption, fileTargets, cwd, logger } = options;

  if (projectOption) {
    const resolved = normalizeExplicitProject(projectOption);
    logDiscovery(logger, 'Using explicit --project path', { project: resolved });
    return resolved;
  }

  const resolvedFromTargets = resolveFromFileTargets(fileTargets, cwd, logger);
  if (resolvedFromTargets) {
    logDiscovery(logger, 'Auto-discovered tsconfig.json from file targets', {
      project: resolvedFromTargets,
    });
    return resolvedFromTargets;
  }

  const startDir = fileTargets.length > 0 ? getCommonAncestor(fileTargets, cwd) : cwd;
  const tsconfigPath = findNearestTsconfig(startDir);
  if (tsconfigPath) {
    logDiscovery(logger, 'Auto-discovered tsconfig.json', { startDir, project: tsconfigPath });
    return tsconfigPath;
  }

  const workspaceResolution = resolveWorkspaceTsconfig(startDir);
  if (workspaceResolution) {
    logDiscovery(logger, 'Resolved tsconfig via Angular workspace', {
      workspace: workspaceResolution.workspacePath,
      project: workspaceResolution.tsconfigPath,
    });
    return workspaceResolution.tsconfigPath;
  }

  throw ErrorHandler.createError(
    `tsconfig.json not found starting from: ${startDir}`,
    'TSCONFIG_NOT_FOUND',
    startDir,
    { startDir }
  );
}

function normalizeExplicitProject(projectOption: string): string {
  try {
    const stats = statSync(projectOption);
    if (stats.isDirectory()) {
      const tsconfigPath = path.join(projectOption, TSCONFIG_NAME);
      if (existsSync(tsconfigPath)) {
        return tsconfigPath;
      }
    }
  } catch {
    // Let downstream validation surface file-not-found errors
  }

  return projectOption;
}

function resolveFromFileTargets(
  fileTargets: string[],
  cwd: string,
  logger?: Logger
): string | undefined {
  if (fileTargets.length === 0) {
    return undefined;
  }

  const targetDirectories = getTargetDirectories(fileTargets, cwd);
  const resolvedConfigs = new Map<string, string[]>();
  const missingTargets: string[] = [];

  for (const directory of targetDirectories) {
    const configPath = findNearestTsconfig(directory);
    if (configPath) {
      const targets = resolvedConfigs.get(configPath) ?? [];
      targets.push(directory);
      resolvedConfigs.set(configPath, targets);
    } else {
      missingTargets.push(directory);
    }
  }

  if (resolvedConfigs.size > 1) {
    const configPaths = Array.from(resolvedConfigs.keys());
    throw ErrorHandler.createError(
      'File targets resolve to multiple tsconfig.json files. Use --project to select one.',
      'INVALID_ARGUMENTS',
      undefined,
      { configs: configPaths }
    );
  }

  if (resolvedConfigs.size === 1 && missingTargets.length > 0) {
    const [configPath] = resolvedConfigs.keys();
    throw ErrorHandler.createError(
      'Some file targets do not resolve to a tsconfig.json. Use --project to select one.',
      'INVALID_ARGUMENTS',
      undefined,
      { configPath, missingTargets }
    );
  }

  const [singleConfig] = resolvedConfigs.keys();
  if (singleConfig) {
    logDiscovery(logger, 'Resolved tsconfig.json for file targets', {
      project: singleConfig,
    });
    return singleConfig;
  }

  return undefined;
}

function getTargetDirectories(fileTargets: string[], cwd: string): string[] {
  const directories = new Set<string>();

  for (const target of fileTargets) {
    const resolvedTarget = resolvePath(target, cwd);
    const directory = resolveTargetDirectory(resolvedTarget);
    directories.add(directory);
  }

  return [...directories];
}

function resolveTargetDirectory(targetPath: string): string {
  try {
    const stats = statSync(targetPath);
    if (stats.isDirectory()) {
      return targetPath;
    }
  } catch {
    // Fall through to treating the target as a file path.
  }

  return path.dirname(targetPath);
}

function findNearestTsconfig(startDir: string): string | undefined {
  return ts.findConfigFile(startDir, ts.sys.fileExists, TSCONFIG_NAME);
}

function resolveWorkspaceTsconfig(startDir: string): WorkspaceResolution | undefined {
  for (const workspaceFile of WORKSPACE_FILES) {
    const workspacePath = ts.findConfigFile(startDir, ts.sys.fileExists, workspaceFile);
    if (!workspacePath) {
      continue;
    }

    const workspaceConfig = readJsonConfig(workspacePath);
    if (!workspaceConfig) {
      continue;
    }

    const tsconfigPath = selectWorkspaceTsconfig(workspaceConfig, workspacePath);
    if (tsconfigPath) {
      return { workspacePath, tsconfigPath };
    }
  }

  return undefined;
}

function readJsonConfig(configPath: string): unknown | undefined {
  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  if (configFile.error) {
    return undefined;
  }
  return configFile.config;
}

function selectWorkspaceTsconfig(
  workspaceConfig: unknown,
  workspacePath: string
): string | undefined {
  if (!workspaceConfig || typeof workspaceConfig !== 'object') {
    return undefined;
  }

  const config = workspaceConfig as {
    defaultProject?: string;
    projects?: Record<string, unknown>;
  };

  const projects = config.projects ?? {};
  const projectNames = Object.keys(projects);
  if (projectNames.length === 0) {
    return undefined;
  }

  const preferredProject =
    (config.defaultProject && projects[config.defaultProject]
      ? config.defaultProject
      : projectNames.length === 1
        ? projectNames[0]
        : undefined) ?? projectNames[0];

  const projectConfig = projects[preferredProject] as {
    architect?: Record<string, { options?: { tsConfig?: string } }>;
    targets?: Record<string, { options?: { tsConfig?: string } }>;
  };

  const targets = projectConfig?.architect ?? projectConfig?.targets ?? {};
  const tsconfig = findWorkspaceTargetTsconfig(targets);
  if (!tsconfig) {
    return undefined;
  }

  const resolvedPath = path.resolve(path.dirname(workspacePath), tsconfig);
  return existsSync(resolvedPath) ? resolvedPath : undefined;
}

function findWorkspaceTargetTsconfig(
  targets: Record<string, { options?: { tsConfig?: string } }>
): string | undefined {
  for (const targetName of WORKSPACE_TARGET_ORDER) {
    const tsconfig = targets[targetName]?.options?.tsConfig;
    if (tsconfig) {
      return tsconfig;
    }
  }

  for (const targetName of Object.keys(targets).sort()) {
    const tsconfig = targets[targetName]?.options?.tsConfig;
    if (tsconfig) {
      return tsconfig;
    }
  }

  return undefined;
}

function getCommonAncestor(fileTargets: string[], cwd: string): string {
  const targetDirs = getTargetDirectories(fileTargets, cwd);
  if (targetDirs.length === 0) {
    return cwd;
  }

  const [first, ...rest] = targetDirs.map((dir) => path.resolve(dir));
  const baseParts = splitPath(first);
  let commonLength = baseParts.length;

  for (const dir of rest) {
    const parts = splitPath(dir);
    commonLength = Math.min(commonLength, parts.length);
    for (let i = 0; i < commonLength; i += 1) {
      if (parts[i] !== baseParts[i]) {
        commonLength = i;
        break;
      }
    }
  }

  const commonParts = baseParts.slice(0, commonLength);
  if (commonParts.length === 0) {
    return path.parse(first).root;
  }

  const [root, ...segments] = commonParts;
  return root ? path.join(root, ...segments) : path.join(...segments);
}

function splitPath(value: string): string[] {
  const resolved = path.resolve(value);
  const { root } = path.parse(resolved);
  const withoutRoot = resolved.slice(root.length);
  const segments = withoutRoot.split(path.sep).filter(Boolean);
  return root ? [root, ...segments] : segments;
}

function resolvePath(value: string, cwd: string): string {
  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

function logDiscovery(
  logger: Logger | undefined,
  message: string,
  context?: Record<string, unknown>
): void {
  logger?.info(LogCategory.FILE_PROCESSING, message, context);
}
