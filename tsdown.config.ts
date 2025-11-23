import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/cli/index.ts'],
  outDir: 'dist/cli',
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  minify: false,
  clean: true,
  skipNodeModulesBundle: true,
  shims: false,
  tsconfig: 'tsconfig.json',
});
