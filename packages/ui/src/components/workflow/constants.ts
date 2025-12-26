/**
 * Workflow Editor Constants
 */

// ============================================================================
// Prompt Variables for Auto-Completion
// ============================================================================

export interface PromptVariable {
  readonly label: string;
  readonly detail: string;
}

export const PROMPT_VARIABLES: readonly PromptVariable[] = [
  { label: 'base_commit', detail: 'Base commit SHA for comparison' },
  { label: 'head_commit', detail: 'Head commit SHA (current)' },
  { label: 'base_branch', detail: 'Base branch name' },
  { label: 'head_branch', detail: 'Head branch name (current)' },
  { label: 'diff_content', detail: 'Full diff content' },
  { label: 'file_path', detail: 'Current file path being reviewed' },
  { label: 'file_content', detail: 'Current file content' },
  { label: 'code_context', detail: 'Surrounding code context' },
  { label: 'language', detail: 'Programming language of the file' },
  { label: 'previous_comments', detail: 'Comments from previous steps' },
] as const;

// ============================================================================
// Theme Classes
// ============================================================================

export const THEME_CLASSES = {
  DARK: 'vscode-dark',
  HIGH_CONTRAST: 'vscode-high-contrast',
} as const;

// ============================================================================
// Editor Themes
// ============================================================================

export const EDITOR_THEMES = {
  DARK: 'vs-dark',
  LIGHT: 'vs',
} as const;

export type EditorTheme = (typeof EDITOR_THEMES)[keyof typeof EDITOR_THEMES];

// ============================================================================
// Webview Commands
// ============================================================================

export const WEBVIEW_COMMANDS = {
  READY: 'ready',
  INITIALIZE: 'initialize',
  SAVE: 'save',
  SAVED: 'saved',
  DUPLICATE: 'duplicate',
} as const;

// ============================================================================
// Monaco Editor Options
// ============================================================================

export const MONACO_EDITOR_OPTIONS = {
  minimap: { enabled: false },
  wordWrap: 'on' as const,
  lineNumbers: 'off' as const,
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  renderLineHighlight: 'none' as const,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  fontSize: 13,
  fontFamily: "var(--vscode-editor-font-family, 'Menlo', 'Monaco', 'Courier New', monospace)",
  padding: { top: 12, bottom: 12 },
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  tabSize: 2,
  scrollbar: {
    vertical: 'auto' as const,
    horizontal: 'auto' as const,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
} as const;

// ============================================================================
// Variable Completion Pattern
// ============================================================================

export const VARIABLE_PATTERN = /\{\{(\w*)$/;
