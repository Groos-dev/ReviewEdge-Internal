/**
 * Extension Constants
 *
 * Centralized constants for command names, error messages, and configuration.
 */

// ============================================================================
// Command Names
// ============================================================================

export const COMMANDS = {
  REFRESH_SIDEBAR: 'mcpCodeReview.refreshSidebar',
  RENDER_COMMENTS: 'mcpCodeReview.renderComments',
  CLEAR_REVIEWS: 'mcpCodeReview.clearReviews',
  CREATE_TASK: 'mcpCodeReview.createTask',
  OPEN_TASK: 'mcpCodeReview.openTask',
  EDIT_TASK: 'mcpCodeReview.editTask',
  DELETE_TASK: 'mcpCodeReview.deleteTask',
  SELECT_WORKFLOW_FOR_TASK: 'mcpCodeReview.selectWorkflowForTask',
  VIEW_TASK_DIFF: 'mcpCodeReview.viewTaskDiff',
  CREATE_WORKFLOW: 'mcpCodeReview.createWorkflow',
  OPEN_WORKFLOW: 'mcpCodeReview.openWorkflow',
  DELETE_WORKFLOW: 'mcpCodeReview.deleteWorkflow',
} as const;

// ============================================================================
// Webview IDs
// ============================================================================

export const WEBVIEW_IDS = {
  SIDEBAR: 'mcpCodeReview.sidebarView',
  WORKFLOW_EDITOR: 'mcpCodeReview.workflowEditor',
  DIFF_VIEWER: 'mcpCodeReview.diffViewer',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  NO_WORKSPACE: 'No workspace folder found',
  TASK_NOT_FOUND: 'Task not found',
  WORKFLOW_NOT_FOUND: 'Workflow not found',
  FAILED_TO_LOAD_TASKS: 'Failed to load tasks',
  FAILED_TO_LOAD_TASK: 'Failed to load task',
  FAILED_TO_LOAD_COMMENTS: 'Failed to load comments',
  FAILED_TO_CREATE_WORKFLOW: 'Failed to create workflow',
  FAILED_TO_SAVE_WORKFLOW: 'Failed to save workflow',
  FAILED_TO_DELETE_WORKFLOW: 'Failed to delete workflow',
  FAILED_TO_DUPLICATE_WORKFLOW: 'Failed to duplicate workflow',
  CANNOT_DELETE_BUILTIN: 'Cannot delete built-in workflow',
  DIFF_VIEWER_NOT_INITIALIZED: 'Diff viewer not initialized',
  TASK_SERVICE_NOT_INITIALIZED: 'TaskService not initialized',
} as const;

// ============================================================================
// Info Messages
// ============================================================================

export const INFO_MESSAGES = {
  WORKFLOW_SAVED: 'Workflow saved',
  REVIEWS_CLEARED: 'Review comments cleared',
  NO_TASKS_FOUND: 'No review tasks found.',
  NO_COMMENTS_FOUND: 'No comments found for this task.',
} as const;

// ============================================================================
// UI Labels
// ============================================================================

export const UI_LABELS = {
  WORKFLOW_NAME_PROMPT: 'Enter workflow name',
  WORKFLOW_NAME_PLACEHOLDER: 'My Custom Workflow',
  DUPLICATE_WORKFLOW_PROMPT: 'Enter name for the duplicated workflow',
  SELECT_TASK_PLACEHOLDER: 'Select a task to render comments',
  RENDER_COMMENTS_TITLE: 'Render Review Comments',
  DELETE_CONFIRM: 'Delete',
  DEFAULT_STEP_NAME: 'Step 1',
  DEFAULT_STEP_CONTENT: 'Review the code changes and add comments.',
} as const;

// ============================================================================
// Webview Paths
// ============================================================================

export const WEBVIEW_PATHS = {
  DIST_WEBVIEW: 'dist/webview',
  WORKFLOW: 'workflow',
  SIDEBAR: 'sidebar',
  DIFFVIEWER: 'diffviewer',
  ASSETS: 'assets',
  CODICONS: 'codicons',
  CODICON_CSS: 'codicon.css',
} as const;

// ============================================================================
// CSS File Patterns
// ============================================================================

export const CSS_FILE_PATTERN = {
  PREFIX: 'ui-',
  SUFFIX: '.css',
} as const;
