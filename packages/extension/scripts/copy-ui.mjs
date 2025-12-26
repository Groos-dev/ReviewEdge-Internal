import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(extensionRoot, '..', '..');

const uiDist = path.join(repoRoot, 'packages', 'ui', 'dist');
const destDir = path.join(extensionRoot, 'dist', 'webview');

if (!fs.existsSync(uiDist)) {
  throw new Error(`UI dist not found at ${uiDist}. Run UI build first.`);
}

// Clean destination
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true });
}
fs.mkdirSync(destDir, { recursive: true });

// Copy JS entry files for each view
const views = ['sidebar', 'diffviewer', 'workflow'];

for (const view of views) {
  const viewDest = path.join(destDir, view);
  fs.mkdirSync(viewDest, { recursive: true });

  // Copy the JS file
  const jsSource = path.join(uiDist, view, 'index.js');
  const jsDest = path.join(viewDest, 'index.js');
  if (fs.existsSync(jsSource)) {
    fs.copyFileSync(jsSource, jsDest);
  } else {
    console.warn(`⚠ JS file not found: ${jsSource}`);
  }
}

// Copy shared chunks
const chunksSource = path.join(uiDist, 'chunks');
const chunksDest = path.join(destDir, 'chunks');
if (fs.existsSync(chunksSource)) {
  fs.cpSync(chunksSource, chunksDest, { recursive: true });
  console.log(`✓ Copied chunks (${fs.readdirSync(chunksSource).length} files)`);
}

// Copy assets (CSS files)
const assetsSource = path.join(uiDist, 'assets');
const assetsDest = path.join(destDir, 'assets');
if (fs.existsSync(assetsSource)) {
  fs.cpSync(assetsSource, assetsDest, { recursive: true });
  console.log(`✓ Copied assets (${fs.readdirSync(assetsSource).length} files)`);
}

// Copy codicons - check root node_modules first, then ui package
let codiconsSource = path.join(repoRoot, 'node_modules', '@vscode', 'codicons', 'dist');
if (!fs.existsSync(codiconsSource)) {
  codiconsSource = path.join(repoRoot, 'packages', 'ui', 'node_modules', '@vscode', 'codicons', 'dist');
}

const codiconsDest = path.join(destDir, 'codicons');
if (fs.existsSync(codiconsSource)) {
  fs.mkdirSync(codiconsDest, { recursive: true });
  for (const file of ['codicon.css', 'codicon.ttf']) {
    const src = path.join(codiconsSource, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(codiconsDest, file));
    }
  }
  console.log('✓ Copied codicons files');
} else {
  console.warn('⚠ Codicons not found, please run: npm install @vscode/codicons');
}

console.log('✓ UI files copied to extension dist');
