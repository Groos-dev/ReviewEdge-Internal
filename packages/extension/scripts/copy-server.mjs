import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(extensionRoot, '..', '..');

const serverDist = path.join(repoRoot, 'packages', 'server', 'dist');
const destDir = path.join(extensionRoot, 'dist', 'server');

if (!fs.existsSync(serverDist)) {
  throw new Error(`Server dist not found at ${serverDist}. Run server build first.`);
}

fs.mkdirSync(destDir, { recursive: true });

for (const fileName of ['index.js', 'index.js.map']) {
  const from = path.join(serverDist, fileName);
  if (!fs.existsSync(from)) continue;
  fs.copyFileSync(from, path.join(destDir, fileName));
}

const wasmFile = 'sql-wasm.wasm';
const wasmSource = path.join(repoRoot, 'node_modules', 'sql.js', 'dist', wasmFile);
const wasmDest = path.join(extensionRoot, 'dist', wasmFile);

if (fs.existsSync(wasmSource)) {
  fs.copyFileSync(wasmSource, wasmDest);
  console.log(`✓ Copied ${wasmFile} to extension dist`);
} else {
  console.warn(`⚠ Warning: ${wasmFile} not found at ${wasmSource}`);
}
