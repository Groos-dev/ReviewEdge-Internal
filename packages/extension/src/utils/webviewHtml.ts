/**
 * Webview HTML Utilities
 *
 * Functions for generating HTML content for webviews.
 */

import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { CSS_FILE_PATTERN, WEBVIEW_PATHS } from '../constants';

/**
 * Find the CSS file matching the pattern in the assets directory
 */
function findCssFile(assetsDir: vscode.Uri): string | null {
  try {
    if (fs.existsSync(assetsDir.fsPath)) {
      const files = fs.readdirSync(assetsDir.fsPath);
      const cssFile = files.find(
        (file) => file.startsWith(CSS_FILE_PATTERN.PREFIX) && file.endsWith(CSS_FILE_PATTERN.SUFFIX)
      );
      return cssFile ?? null;
    }
  } catch (error) {
    console.error('[webviewHtml] Failed to read CSS file:', error);
  }
  return null;
}

/**
 * Get common webview URIs for assets
 */
function getCommonAssetUris(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): { cssUri: string; codiconsUri: string } {
  const assetsDir = vscode.Uri.joinPath(
    extensionUri,
    WEBVIEW_PATHS.DIST_WEBVIEW,
    WEBVIEW_PATHS.ASSETS
  );

  let cssUri = '';
  const cssFile = findCssFile(assetsDir);
  if (cssFile) {
    cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsDir, cssFile)).toString();
  }

  const codiconsUri = webview.asWebviewUri(
    vscode.Uri.joinPath(
      extensionUri,
      WEBVIEW_PATHS.DIST_WEBVIEW,
      WEBVIEW_PATHS.CODICONS,
      WEBVIEW_PATHS.CODICON_CSS
    )
  );

  return { cssUri, codiconsUri: codiconsUri.toString() };
}

/**
 * Generate CSP meta tag for standard webviews
 */
function generateStandardCsp(cspSource: string): string {
  return `default-src 'none'; script-src ${cspSource}; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource};`;
}

/**
 * Generate CSP meta tag for Monaco Editor webviews (requires blob: for workers)
 */
function generateMonacoCsp(cspSource: string): string {
  return `default-src 'none'; script-src ${cspSource} blob:; worker-src ${cspSource} blob:; style-src ${cspSource} 'unsafe-inline'; font-src ${cspSource} data:;`;
}

interface WebviewHtmlOptions {
  title: string;
  scriptPath: string;
  useMonaco?: boolean;
}

/**
 * Generate HTML for a webview
 */
export function generateWebviewHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  options: WebviewHtmlOptions
): string {
  const { title, scriptPath, useMonaco = false } = options;

  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, WEBVIEW_PATHS.DIST_WEBVIEW, scriptPath, 'index.js')
  );

  const { cssUri, codiconsUri } = getCommonAssetUris(webview, extensionUri);

  const csp = useMonaco
    ? generateMonacoCsp(webview.cspSource)
    : generateStandardCsp(webview.cspSource);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <title>${title}</title>
  <link rel="stylesheet" href="${codiconsUri}">
  ${cssUri ? `<link rel="stylesheet" href="${cssUri}">` : ''}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * Generate HTML for the Workflow Editor
 */
export function generateWorkflowEditorHtml(
  webview: vscode.Webview,
  extensionUri: vscode.Uri
): string {
  return generateWebviewHtml(webview, extensionUri, {
    title: 'Workflow Editor',
    scriptPath: WEBVIEW_PATHS.WORKFLOW,
    useMonaco: true,
  });
}

/**
 * Generate HTML for the Sidebar
 */
export function generateSidebarHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  return generateWebviewHtml(webview, extensionUri, {
    title: 'MCP Code Review',
    scriptPath: WEBVIEW_PATHS.SIDEBAR,
    useMonaco: false,
  });
}

/**
 * Generate HTML for the Diff Viewer
 */
export function generateDiffViewerHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  return generateWebviewHtml(webview, extensionUri, {
    title: 'Diff Viewer',
    scriptPath: WEBVIEW_PATHS.DIFFVIEWER,
    useMonaco: false,
  });
}
