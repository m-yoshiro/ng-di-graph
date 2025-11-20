import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@src': resolve(__dirname, 'src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts', 'tests/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/tests/**/*', 'src/cli/**/*', 'src/types/**/*'],
      thresholds: {
        lines: 79,
        statements: 79,
        functions: 90,
        branches: 67
      }
    }
  }
});
