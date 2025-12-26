/**
 * Workspace Utilities
 *
 * Common utilities for working with VS Code workspace.
 */

import * as vscode from 'vscode';
import { ERROR_MESSAGES } from '../constants';

/**
 * Result type for workspace path retrieval
 */
export type WorkspacePathResult =
  | { success: true; path: string }
  | { success: false; error: string };

/**
 * Get the current workspace folder path
 * Returns a result object instead of throwing
 */
export function getWorkspacePath(): WorkspacePathResult {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  if (!workspacePath) {
    return { success: false, error: ERROR_MESSAGES.NO_WORKSPACE };
  }

  return { success: true, path: workspacePath };
}

/**
 * Get workspace path or show error message and return null
 */
export function getWorkspacePathOrShowError(): string | null {
  const result = getWorkspacePath();

  if (!result.success) {
    vscode.window.showErrorMessage(result.error);
    return null;
  }

  return result.path;
}
