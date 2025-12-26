/**
 * Task Commands
 *
 * Command handlers for task-related operations.
 */

import * as vscode from 'vscode';
import { ERROR_MESSAGES, INFO_MESSAGES, UI_LABELS } from '../constants';
import type { DiffViewerProvider } from '../providers/DiffViewerProvider';
import type { CodeReviewClient } from '../services/CodeReviewClient';
import { getWorkspacePathOrShowError } from '../utils/workspace';

/**
 * Render comments for a selected task
 */
export async function renderTaskComments(client: CodeReviewClient): Promise<void> {
  const workspacePath = getWorkspacePathOrShowError();
  if (!workspacePath) return;

  let tasks: Awaited<ReturnType<typeof client.listTasks>> | undefined;
  try {
    tasks = await client.listTasks(workspacePath);
  } catch {
    vscode.window.showErrorMessage(ERROR_MESSAGES.FAILED_TO_LOAD_TASKS);
    return;
  }

  if (tasks.length === 0) {
    vscode.window.showWarningMessage(INFO_MESSAGES.NO_TASKS_FOUND);
    return;
  }

  const taskItems = tasks.map((t) => ({
    label: t.name,
    description: `${t.headBranch} → ${t.baseBranch}`,
    task: t,
  }));

  const selected = await vscode.window.showQuickPick(taskItems, {
    placeHolder: UI_LABELS.SELECT_TASK_PLACEHOLDER,
    title: UI_LABELS.RENDER_COMMENTS_TITLE,
  });

  if (!selected) return;

  let comments: Awaited<ReturnType<typeof client.getCommentsByTask>> | undefined;
  try {
    comments = await client.getCommentsByTask(selected.task.id, workspacePath);
  } catch {
    vscode.window.showErrorMessage(ERROR_MESSAGES.FAILED_TO_LOAD_COMMENTS);
    return;
  }

  if (comments.length === 0) {
    vscode.window.showInformationMessage(INFO_MESSAGES.NO_COMMENTS_FOUND);
    return;
  }

  vscode.window.showInformationMessage(
    `Found ${comments.length} comment(s) for task: ${selected.task.name}`
  );
}

/**
 * View diff for a task
 */
export async function viewTaskDiff(
  client: CodeReviewClient,
  taskId: string,
  diffViewerProvider: DiffViewerProvider | null
): Promise<void> {
  const workspacePath = getWorkspacePathOrShowError();
  if (!workspacePath) {
    return;
  }

  if (!diffViewerProvider) {
    vscode.window.showErrorMessage(ERROR_MESSAGES.DIFF_VIEWER_NOT_INITIALIZED);
    return;
  }

  let task: Awaited<ReturnType<typeof client.getTask>> | undefined;
  try {
    task = await client.getTask(taskId, workspacePath);
  } catch (error) {
    console.error('[viewTaskDiff] Error getting task:', error);
    vscode.window.showErrorMessage(ERROR_MESSAGES.FAILED_TO_LOAD_TASK);
    return;
  }

  if (!task) {
    vscode.window.showErrorMessage(ERROR_MESSAGES.TASK_NOT_FOUND);
    return;
  }

  await diffViewerProvider.showDiff(task, workspacePath);
}

/**
 * Clear all reviews (placeholder)
 */
export function clearReviews(): void {
  vscode.window.showInformationMessage(INFO_MESSAGES.REVIEWS_CLEARED);
}

/**
 * Open a task (placeholder for future implementation)
 */
export function openTask(taskId: string): void {
  vscode.window.showInformationMessage(`Opening task: ${taskId}`);
}
