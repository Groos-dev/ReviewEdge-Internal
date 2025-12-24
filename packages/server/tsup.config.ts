import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  noExternal: ['sql.js', '@modelcontextprotocol/sdk', 'zod'],
  loader: {
    '.sql': 'text',
  },
  platform: 'node',
  target: 'node20',
});
