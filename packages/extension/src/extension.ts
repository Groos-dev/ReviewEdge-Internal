import * as vscode from 'vscode';
import { CodeReviewCore } from '../../server/src/core/CodeReviewCore.js';
import { InProcessMessenger } from '../../server/src/protocol/InProcessMessenger.js';
import type { FromServerProtocol, ToServerProtocol } from '../../server/src/protocol/types.js';
import type { ReviewComment, ReviewTask } from '../../ui/src/types/config';
import { DiffViewerProvider } from './providers/DiffViewerProvider';
import { SidebarProvider } from './providers/SidebarProvider';
import { CodeReviewClient } from './services/CodeReviewClient';
import { GitService } from './services/GitService';
import { TaskService } from './services/TaskService';

// Global instances for in-process communication
let messenger: InProcessMessenger<ToServerProtocol, FromServerProtocol> | null = null;
let client: CodeReviewClient | null = null;
let taskService: TaskService | null = null;
let gitService: GitService | null = null;
let diffViewerProvider: DiffViewerProvider | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log('MCP Code Review: Starting activation');

  try {
    // Initialize in-process communication
    console.log('Initializing in-process messenger...');
    messenger = new InProcessMessenger<ToServerProtocol, FromServerProtocol>();
    // Initialize core to handle messages
    new CodeReviewCore(messenger);
    client = new CodeReviewClient(messenger);
    taskService = new TaskService();
    gitService = new GitService();
    console.log('✓ In-process communication initialized');

    // Register Sidebar Provider
    console.log('Registering sidebar provider...');
    const sidebarProvider = new SidebarProvider(context.extensionUri, client);
    context.subscriptions.push(
      vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
    );
    console.log('✓ Sidebar registered');

    // Register Diff Viewer Provider
    console.log('Registering diff viewer provider...');
    diffViewerProvider = new DiffViewerProvider(context.extensionUri, gitService, client);
    console.log('✓ Diff viewer provider registered');

    // Register Commands
    console.log('Registering commands...');
    registerCommands(context, sidebarProvider, client);
    console.log('✓ Commands registered');

    // Refresh sidebar
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (workspacePath) {
      sidebarProvider.refresh();
    }

    console.log('MCP Code Review: Activation complete');
  } catch (error) {
    console.error('MCP Code Review: Activation FAILED', error);
    vscode.window.showErrorMessage(`MCP Code Review failed to activate: ${error}`);
    throw error;
  }
}

export function deactivate(): void {
  // Cleanup in-process resources
  messenger = null;
  client = null;
  taskService = null;
  gitService = null;
  diffViewerProvider = null;
}

function registerCommands(
  context: vscode.ExtensionContext,
  sidebarProvider: SidebarProvider,
  client: CodeReviewClient
): void {
  if (!taskService) {
    throw new Error('TaskService not initialized');
  }

  const commands = [
    vscode.commands.registerCommand('mcpCodeReview.refreshSidebar', () => {
      sidebarProvider.refresh();
    }),
    vscode.commands.registerCommand('mcpCodeReview.renderComments', () =>
      renderTaskComments(client)
    ),

    vscode.commands.registerCommand('mcpCodeReview.clearReviews', clearReviews),
    vscode.commands.registerCommand('mcpCodeReview.createTask', async () => {
      if (!taskService) return;
      await taskService.createTask(client, sidebarProvider);
    }),

    vscode.commands.registerCommand('mcpCodeReview.openTask', async (taskId: string) => {
      // Open task logic
      vscode.window.showInformationMessage(`Opening task: ${taskId}`);
    }),

    vscode.commands.registerCommand('mcpCodeReview.editTask', async (taskId: string) => {
      if (!taskService) return;
      await taskService.editTask(client, taskId, sidebarProvider);
    }),

    vscode.commands.registerCommand(
      'mcpCodeReview.selectWorkflowForTask',
      async (taskId: string) => {
        if (!taskService) return;
        await taskService.selectWorkflowForTask(client, taskId, sidebarProvider);
      }
    ),
    vscode.commands.registerCommand('mcpCodeReview.viewTaskDiff', async (taskId: string) => {
      await viewTaskDiff(client, taskId);
    }),
    vscode.commands.registerCommand('mcpCodeReview.createWorkflow', async () => {
      vscode.window.showInformationMessage('Create workflow functionality');
    }),
    vscode.commands.registerCommand('mcpCodeReview.openWorkflow', async (workflowId: string) => {
      vscode.window.showInformationMessage(`Opening workflow: ${workflowId}`);
    }),
    vscode.commands.registerCommand('mcpCodeReview.deleteWorkflow', async (workflowId: string) => {
      vscode.window.showInformationMessage(`Deleting workflow: ${workflowId}`);
    }),
  ];

  context.subscriptions.push(...commands);
}

async function renderTaskComments(client: CodeReviewClient): Promise<void> {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  let tasks: ReviewTask[];
  try {
    tasks = await client.listTasks(workspacePath);
  } catch {
    vscode.window.showErrorMessage('Failed to load tasks');
    return;
  }

  if (tasks.length === 0) {
    vscode.window.showWarningMessage('No review tasks found.');
    return;
  }

  const taskItems = tasks.map((t) => ({
    label: t.name,
    description: `${t.headBranch} → ${t.baseBranch}`,
    task: t,
  }));

  const selected = await vscode.window.showQuickPick(taskItems, {
    placeHolder: 'Select a task to render comments',
    title: 'Render Review Comments',
  });

  if (!selected) return;

  let comments: ReviewComment[];
  try {
    comments = await client.getCommentsByTask(selected.task.id, workspacePath);
  } catch {
    vscode.window.showErrorMessage('Failed to load comments');
    return;
  }

  if (comments.length === 0) {
    vscode.window.showInformationMessage('No comments found for this task.');
    return;
  }

  vscode.window.showInformationMessage(
    `Found ${comments.length} comment(s) for task: ${selected.task.name}`
  );
}

async function viewTaskDiff(client: CodeReviewClient, taskId: string): Promise<void> {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspacePath) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  let task: ReviewTask | null = null;
  try {
    task = await client.getTask(taskId, workspacePath);
  } catch {
    vscode.window.showErrorMessage('Failed to load task');
    return;
  }

  if (!task) {
    vscode.window.showErrorMessage('Task not found');
    return;
  }

  if (!diffViewerProvider) {
    vscode.window.showErrorMessage('Diff viewer not initialized');
    return;
  }

  await diffViewerProvider.showDiff(task, workspacePath);
}

function clearReviews(): void {
  vscode.window.showInformationMessage('Review comments cleared');
}
