import { defineConfig } from 'tsup';

export default defineConfig([
  // Sidebar webview
  {
    entry: ['src/components/sidebar/index.tsx'],
    format: ['iife'],
    outDir: 'dist/sidebar',
    globalName: 'Sidebar',
    sourcemap: false,
    minify: true,
    noExternal: ['react', 'react-dom'],
    platform: 'browser',
    target: 'es2020',
    loader: {
      '.css': 'text',
    },
    esbuildOptions(options) {
      options.banner = {
        js: '// @ts-nocheck',
      };
    },
  },
  // DiffViewer webview
  {
    entry: ['src/components/diffviewer/index.tsx'],
    format: ['iife'],
    outDir: 'dist/diffviewer',
    globalName: 'DiffViewer',
    sourcemap: false,
    minify: true,
    noExternal: ['react', 'react-dom'],
    platform: 'browser',
    target: 'es2020',
    loader: {
      '.css': 'text',
    },
    esbuildOptions(options) {
      options.banner = {
        js: '// @ts-nocheck',
      };
    },
  },
  // WorkflowEditor webview
  {
    entry: ['src/components/workflow/index.tsx'],
    format: ['iife'],
    outDir: 'dist/workflow',
    globalName: 'WorkflowEditor',
    sourcemap: false,
    minify: true,
    noExternal: ['react', 'react-dom'],
    platform: 'browser',
    target: 'es2020',
    loader: {
      '.css': 'text',
    },
    esbuildOptions(options) {
      options.banner = {
        js: '// @ts-nocheck',
      };
    },
  },
]);
