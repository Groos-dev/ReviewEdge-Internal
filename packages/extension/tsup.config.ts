import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  outDir: 'dist',
  external: ['vscode'],
  sourcemap: true,
  clean: false, // Managed by build script
  dts: true,
  platform: 'node',
  target: 'node20',
  loader: {
    '.sql': 'text',
  },
});
