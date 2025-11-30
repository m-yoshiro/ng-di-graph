import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function collectFiles(dirPath: string): string[] {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const resolvedPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(resolvedPath));
    } else if (entry.isFile()) {
      files.push(resolvedPath);
    }
  }

  return files;
}

describe('Core console guard', () => {
  it('prevents ambient console usage in core modules', () => {
    const coreDir = path.resolve(__dirname, '..', 'core');
    const allowedConsoleFiles = new Set(['logger.ts', 'error-handler.ts']);

    const coreFiles = collectFiles(coreDir).filter((filePath) => filePath.endsWith('.ts'));
    const offenders = coreFiles.filter((filePath) => {
      const fileName = path.basename(filePath);
      if (allowedConsoleFiles.has(fileName)) {
        return false;
      }

      const fileContent = readFileSync(filePath, 'utf8');
      return /console\.(log|warn|error|debug|info)/.test(fileContent);
    });

    expect(offenders).toEqual([]);
  });
});
