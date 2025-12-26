# MCP Code Review UI Package

Standard React + TypeScript + Vite project providing Webview UI components for the VS Code extension.

## Project Structure

```
packages/ui/
├── src/
│   ├── components/       # React components
│   │   ├── sidebar/     # Sidebar view
│   │   ├── diffviewer/  # Diff viewer
│   │   └── workflow/    # Workflow editor
│   ├── styles/          # CSS style files
│   ├── types/           # TypeScript type definitions
│   └── utils/           # Utility functions
├── vite.config.ts       # Vite build configuration
├── tsconfig.json        # TypeScript configuration
└── package.json
```

## Tech Stack

- **React 18.3** - UI framework
- **TypeScript 5.4** - Type system
- **Vite 6.0** - Build tool
- **CSS** - Styles (using VS Code theme variables)

## Build Configuration

### Vite Library Mode

Uses Vite's Library Mode to bundle each component as an independent ES module:

- **Entry points**: `sidebar/index.tsx`, `diffviewer/index.tsx`, `workflow/index.tsx`
- **Output format**: ES Module
- **Code splitting**:
  - Each component has its own `[component]/index.js`
  - React and react-dom extracted to `chunks/common-[hash].js`
  - All CSS merged into `assets/ui-[hash].css`

### Build Output

```
dist/
├── sidebar/
│   └── index.js          # Sidebar component
├── diffviewer/
│   └── index.js          # Diff viewer component
├── workflow/
│   └── index.js          # Workflow editor component
├── chunks/
│   └── common-[hash].js  # Shared dependencies (React)
└── assets/
    └── ui-[hash].css     # All styles
```

## Development

```bash
# Install dependencies
npm install

# Development mode (watch for file changes)
npm run dev

# Type checking
npm run type-check

# Build production version
npm run build
```

## Integration with Extension

The Extension package during build will:

1. Copy all files from `dist/` to `extension/dist/webview/`
2. Dynamically generate HTML at runtime, referencing the bundled JS and CSS
3. Use VS Code Webview API to load and display the UI

### HTML Generation Example

```typescript
// In SidebarProvider.ts
private _getHtmlForWebview(webview: vscode.Webview): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'sidebar', 'index.js')
  );
  const cssUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets', 'ui-[hash].css')
  );

  return `<!DOCTYPE html>
<html>
  <head>
    <link rel="stylesheet" href="${cssUri}">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${scriptUri}"></script>
  </body>
</html>`;
}
```

## CSS Style Guidelines

Use VS Code provided CSS variables to ensure consistency with editor theme:

```css
.my-component {
  color: var(--vscode-foreground);
  background-color: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
}
```

Common variables:
- `--vscode-foreground` - Foreground color
- `--vscode-editor-background` - Editor background
- `--vscode-button-background` - Button background
- `--vscode-input-background` - Input background
- See more at [VS Code Theme Colors](https://code.visualstudio.com/api/references/theme-color)

## VS Code API Integration

Each component can communicate with the extension via `acquireVsCodeApi()`:

```typescript
declare const acquireVsCodeApi: () => {
  postMessage: (message: any) => void;
  getState: () => any;
  setState: (state: any) => void;
};

const vscode = acquireVsCodeApi();

// Send message to extension
vscode.postMessage({ command: 'doSomething', data: {...} });

// Receive messages from extension
window.addEventListener('message', (event) => {
  const message = event.data;
  // Handle message
});
```

## Performance Optimization

1. **Code splitting**: React and react-dom are extracted to a separate chunk, shared across all components
2. **CSS merging**: All styles merged into one file, reducing request count
3. **Tree Shaking**: Vite automatically removes unused code
4. **Minification**: Production build automatically compresses code

## Important Notes

1. **Don't use resources from node_modules**: Webview cannot access the file system
2. **CSP restrictions**: Inline scripts and styles are restricted, CSP needs to be configured in HTML
3. **Path resolution**: All resource URIs must be converted via `webview.asWebviewUri()`
4. **State management**: Use `vscode.setState/getState` instead of localStorage

## Build Optimization Suggestions

To further optimize build size:

1. Consider using Preact instead of React (reduces ~30KB)
2. Use dynamic imports for on-demand loading
3. Compress CSS variable names (requires custom PostCSS plugin)
4. Use CDN for React (not recommended due to Webview isolation)
