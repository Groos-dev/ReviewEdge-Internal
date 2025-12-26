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
    '.md': 'text',
  },
  platform: 'node',
  target: 'node20',
  banner: {
    // Provide a real `require` function for ESM bundles that include CJS dependencies (e.g. sql.js)
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});
