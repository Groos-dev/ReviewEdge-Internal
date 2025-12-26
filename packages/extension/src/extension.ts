/**
 * MCP Code Review Extension
 *
 * Main entry point for the VS Code extension.
 * Handles activation, deactivation, and service initialization.
 */

import * as vscode from 'vscode';
import { CodeReviewCore } from '../../server/src/core/CodeReviewCore.js';
import { InProcessMessenger } from '../../server/src/protocol/InProcessMessenger.js';
import type { FromServerProtocol, ToServerProtocol } from '../../server/src/protocol/types.js';
import { registerCommands } from './commands';
import { DiffViewerProvider } from './providers/DiffViewerProvider';
import { SidebarProvider } from './providers/SidebarProvider';
import { CodeReviewClient } from './services/CodeReviewClient';
import { GitService } from './services/GitService';
import { TaskService } from './services/TaskService';

// ============================================================================
// Extension State
// ============================================================================

interface ExtensionState {
  messenger: InProcessMessenger<ToServerProtocol, FromServerProtocol> | null;
  client: CodeReviewClient | null;
  taskService: TaskService | null;
  gitService: GitService | null;
  diffViewerProvider: DiffViewerProvider | null;
}

const state: ExtensionState = {
  messenger: null,
  client: null,
  taskService: null,
  gitService: null,
  diffViewerProvider: null,
};

// ============================================================================
// Activation
// ============================================================================

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // TODO(logging): Replace console logs with a dedicated OutputChannel + log levels.
  //   This keeps user logs clean and makes bug reports easier.
  console.log('MCP Code Review: Starting activation');

  try {
    initializeServices(context);
    const sidebarProvider = registerProviders(context);
    registerAllCommands(context, sidebarProvider);
    refreshSidebarIfWorkspaceExists(sidebarProvider);

    console.log('MCP Code Review: Activation complete');
  } catch (error) {
    handleActivationError(error);
  }
}

/**
 * Initialize all services for in-process communication
 */
function initializeServices(_context: vscode.ExtensionContext): void {
  console.log('Initializing in-process messenger...');

  state.messenger = new InProcessMessenger<ToServerProtocol, FromServerProtocol>();
  new CodeReviewCore(state.messenger);
  state.client = new CodeReviewClient(state.messenger);
  state.taskService = new TaskService();
  state.gitService = new GitService();

  console.log('✓ In-process communication initialized');
}

/**
 * Register webview providers
 */
function registerProviders(context: vscode.ExtensionContext): SidebarProvider {
  if (!state.client || !state.gitService) {
    throw new Error('Services not initialized');
  }

  console.log('Registering providers...');

  // Sidebar Provider
  const sidebarProvider = new SidebarProvider(context.extensionUri, state.client);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
  );
  console.log('✓ Sidebar registered');

  // Diff Viewer Provider
  state.diffViewerProvider = new DiffViewerProvider(
    context.extensionUri,
    state.gitService,
    state.client
  );
  console.log('✓ Diff viewer provider registered');

  return sidebarProvider;
}

/**
 * Register all commands
 */
function registerAllCommands(
  context: vscode.ExtensionContext,
  sidebarProvider: SidebarProvider
): void {
  if (!state.client || !state.taskService) {
    throw new Error('Services not initialized');
  }

  console.log('Registering commands...');

  registerCommands({
    context,
    sidebarProvider,
    client: state.client,
    taskService: state.taskService,
    diffViewerProvider: state.diffViewerProvider,
  });

  console.log('✓ Commands registered');
}

/**
 * Refresh sidebar if workspace exists
 */
function refreshSidebarIfWorkspaceExists(sidebarProvider: SidebarProvider): void {
  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspacePath) {
    sidebarProvider.refresh();
  }
}

/**
 * Handle activation errors
 */
function handleActivationError(error: unknown): never {
  console.error('MCP Code Review: Activation FAILED', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  vscode.window.showErrorMessage(`MCP Code Review failed to activate: ${errorMessage}`);
  throw error;
}

// ============================================================================
// Deactivation
// ============================================================================

export function deactivate(): void {
  state.messenger = null;
  state.client = null;
  state.taskService = null;
  state.gitService = null;
  state.diffViewerProvider = null;
}
