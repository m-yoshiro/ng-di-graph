import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  outDir: 'dist/cli',
  target: 'node20',
  format: ['cjs'],
  platform: 'node',
  sourcemap: true,
  splitting: false,
  clean: false,
  minify: false,
  skipNodeModulesBundle: true,
  shims: false,
  tsconfig: 'tsconfig.json',
});
