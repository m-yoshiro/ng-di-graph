import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Handles output writing to stdout or files
 * Supports directory creation and error handling
 */
export class OutputHandler {
  /**
   * Write output content to stdout or file
   * @param content The content to write
   * @param filePath Optional file path. If not provided, writes to stdout
   */
  async writeOutput(content: string, filePath?: string): Promise<void> {
    if (!filePath) {
      // Write to stdout
      process.stdout.write(content);
      return;
    }

    try {
      // Ensure directory exists
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Write to file
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(
        `Failed to write output file: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
