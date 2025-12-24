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

fs.mkdirSync(destDir, { recursive: true });

// Copy sidebar
const sidebarSource = path.join(uiDist, 'sidebar');
const sidebarDest = path.join(destDir, 'sidebar');
if (fs.existsSync(sidebarSource)) {
  if (fs.existsSync(sidebarDest)) {
    fs.rmSync(sidebarDest, { recursive: true });
  }
  fs.cpSync(sidebarSource, sidebarDest, { recursive: true });
}

// Copy diffviewer
const diffviewerSource = path.join(uiDist, 'diffviewer');
const diffviewerDest = path.join(destDir, 'diffviewer');
if (fs.existsSync(diffviewerSource)) {
  if (fs.existsSync(diffviewerDest)) {
    fs.rmSync(diffviewerDest, { recursive: true });
  }
  fs.cpSync(diffviewerSource, diffviewerDest, { recursive: true });
}

// Copy workflow
const workflowSource = path.join(uiDist, 'workflow');
const workflowDest = path.join(destDir, 'workflow');
if (fs.existsSync(workflowSource)) {
  if (fs.existsSync(workflowDest)) {
    fs.rmSync(workflowDest, { recursive: true });
  }
  fs.cpSync(workflowSource, workflowDest, { recursive: true });
}

console.log('✓ UI files copied to extension dist');
