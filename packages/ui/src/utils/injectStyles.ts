/**
 * Utility function to inject CSS styles into the document
 * Used for webview components that need to inject styles at runtime
 */

export function injectStyles(css: string): void {
  // Check if styles are already injected
  const existingStyle = document.getElementById('mcp-codereview-styles');
  if (existingStyle) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'mcp-codereview-styles';
  style.textContent = css;
  document.head.appendChild(style);
}
