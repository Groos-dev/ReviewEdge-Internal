/**
 * Command Registration
 *
 * Centralized command registration for the extension.
 */

import * as vscode from 'vscode';
import { COMMANDS } from '../constants';
import type { DiffViewerProvider } from '../providers/DiffViewerProvider';
import type { SidebarProvider } from '../providers/SidebarProvider';
import type { CodeReviewClient } from '../services/CodeReviewClient';
import type { TaskService } from '../services/TaskService';
import { clearReviews, openTask, renderTaskComments, viewTaskDiff } from './taskCommands';
import { createWorkflow, deleteWorkflow, openWorkflow } from './workflowCommands';

interface CommandRegistrationDependencies {
  context: vscode.ExtensionContext;
  sidebarProvider: SidebarProvider;
  client: CodeReviewClient;
  taskService: TaskService;
  diffViewerProvider: DiffViewerProvider | null;
}

/**
 * Register all extension commands
 */
export function registerCommands(deps: CommandRegistrationDependencies): void {
  const { context, sidebarProvider, client, taskService, diffViewerProvider } = deps;

  const commands: vscode.Disposable[] = [
    // Sidebar commands
    vscode.commands.registerCommand(COMMANDS.REFRESH_SIDEBAR, () => {
      sidebarProvider.refresh();
    }),

    // Task commands
    vscode.commands.registerCommand(COMMANDS.RENDER_COMMENTS, () => renderTaskComments(client)),

    vscode.commands.registerCommand(COMMANDS.CLEAR_REVIEWS, clearReviews),

    vscode.commands.registerCommand(COMMANDS.CREATE_TASK, async () => {
      await taskService.createTask(client, sidebarProvider);
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_TASK, (taskId: string) => {
      openTask(taskId);
    }),

    vscode.commands.registerCommand(COMMANDS.EDIT_TASK, async (taskId: string) => {
      await taskService.editTask(client, taskId, sidebarProvider);
    }),

    vscode.commands.registerCommand(COMMANDS.SELECT_WORKFLOW_FOR_TASK, async (taskId: string) => {
      await taskService.selectWorkflowForTask(client, taskId, sidebarProvider);
    }),

    vscode.commands.registerCommand(COMMANDS.VIEW_TASK_DIFF, async (taskId: string) => {
      await viewTaskDiff(client, taskId, diffViewerProvider);
    }),

    // Workflow commands
    vscode.commands.registerCommand(COMMANDS.CREATE_WORKFLOW, async () => {
      await createWorkflow(client, context, sidebarProvider);
    }),

    vscode.commands.registerCommand(COMMANDS.OPEN_WORKFLOW, async (workflowId: string) => {
      await openWorkflow(client, context, workflowId, sidebarProvider);
    }),

    vscode.commands.registerCommand(COMMANDS.DELETE_WORKFLOW, async (workflowId: string) => {
      await deleteWorkflow(client, workflowId, sidebarProvider);
    }),
  ];

  context.subscriptions.push(...commands);
}
