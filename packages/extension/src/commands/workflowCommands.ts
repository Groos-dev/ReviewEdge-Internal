/**
 * Workflow Commands
 *
 * Command handlers for workflow management operations.
 */

import * as vscode from 'vscode';
import { ERROR_MESSAGES, INFO_MESSAGES, UI_LABELS, WEBVIEW_IDS } from '../constants';
import type { SidebarProvider } from '../providers/SidebarProvider';
import type { CodeReviewClient } from '../services/CodeReviewClient';
import type {
  WorkflowEditorIncomingMessage,
  WorkflowEditorInitializeMessage,
  WorkflowEditorSavedMessage,
  WorkflowNodeInput,
} from '../types/webview';
import { generateWorkflowEditorHtml } from '../utils/webviewHtml';
import { getWorkspacePathOrShowError } from '../utils/workspace';

/**
 * Create a new workflow
 */
export async function createWorkflow(
  client: CodeReviewClient,
  context: vscode.ExtensionContext,
  sidebarProvider: SidebarProvider
): Promise<void> {
  const workspacePath = getWorkspacePathOrShowError();
  if (!workspacePath) return;

  const name = await vscode.window.showInputBox({
    prompt: UI_LABELS.WORKFLOW_NAME_PROMPT,
    placeHolder: UI_LABELS.WORKFLOW_NAME_PLACEHOLDER,
    validateInput: (value) => (value.trim() ? null : 'Name is required'),
  });

  if (!name) return;

  const defaultNode: WorkflowNodeInput = {
    name: UI_LABELS.DEFAULT_STEP_NAME,
    content: UI_LABELS.DEFAULT_STEP_CONTENT,
    order: 0,
  };

  try {
    const workflow = await client.createWorkflow(
      {
        name: name.trim(),
        description: '',
        nodes: [defaultNode],
      },
      workspacePath
    );

    if (workflow) {
      sidebarProvider.refresh();
      await openWorkflowEditor(context, client, workflow.id, workspacePath, sidebarProvider);
    }
  } catch (error) {
    console.error('[WorkflowCommands] Failed to create workflow:', error);
    vscode.window.showErrorMessage(ERROR_MESSAGES.FAILED_TO_CREATE_WORKFLOW);
  }
}

/**
 * Open an existing workflow
 */
export async function openWorkflow(
  client: CodeReviewClient,
  context: vscode.ExtensionContext,
  workflowId: string,
  sidebarProvider: SidebarProvider
): Promise<void> {
  const workspacePath = getWorkspacePathOrShowError();
  if (!workspacePath) return;

  await openWorkflowEditor(context, client, workflowId, workspacePath, sidebarProvider);
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(
  client: CodeReviewClient,
  workflowId: string,
  sidebarProvider: SidebarProvider
): Promise<void> {
  const workspacePath = getWorkspacePathOrShowError();
  if (!workspacePath) return;

  const isBuiltin = await client.isBuiltinWorkflow(workflowId, workspacePath);
  if (isBuiltin) {
    vscode.window.showWarningMessage(ERROR_MESSAGES.CANNOT_DELETE_BUILTIN);
    return;
  }

  const workflow = await client.getWorkflow(workflowId, workspacePath);
  if (!workflow) {
    vscode.window.showErrorMessage(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
    return;
  }

  const confirmMessage = `Delete workflow "${workflow.name}"? Tasks using this workflow will be reassigned to the default workflow.`;
  const confirm = await vscode.window.showWarningMessage(
    confirmMessage,
    { modal: true },
    UI_LABELS.DELETE_CONFIRM
  );

  if (confirm === UI_LABELS.DELETE_CONFIRM) {
    const result = await client.deleteWorkflow(workflowId, workspacePath);
    if (result.success) {
      sidebarProvider.refresh();
      vscode.window.showInformationMessage(`Workflow deleted: ${workflow.name}`);
    } else {
      vscode.window.showErrorMessage(result.error ?? ERROR_MESSAGES.FAILED_TO_DELETE_WORKFLOW);
    }
  }
}

/**
 * Open the workflow editor panel
 */
async function openWorkflowEditor(
  context: vscode.ExtensionContext,
  client: CodeReviewClient,
  workflowId: string,
  workspacePath: string,
  sidebarProvider: SidebarProvider
): Promise<void> {
  const workflow = await client.getWorkflow(workflowId, workspacePath);
  if (!workflow) {
    vscode.window.showErrorMessage(ERROR_MESSAGES.WORKFLOW_NOT_FOUND);
    return;
  }

  const isBuiltin = await client.isBuiltinWorkflow(workflowId, workspacePath);

  const baseTitle = `Workflow: ${workflow.name}`;
  const panel = vscode.window.createWebviewPanel(
    WEBVIEW_IDS.WORKFLOW_EDITOR,
    baseTitle,
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')],
    }
  );

  panel.webview.html = generateWorkflowEditorHtml(panel.webview, context.extensionUri);

  panel.webview.onDidReceiveMessage(async (message: WorkflowEditorIncomingMessage) => {
    await handleWorkflowEditorMessage(
      message,
      panel,
      client,
      workspacePath,
      sidebarProvider,
      context,
      workflow,
      isBuiltin,
      baseTitle
    );
  });
}

/**
 * Handle messages from the workflow editor webview
 */
async function handleWorkflowEditorMessage(
  message: WorkflowEditorIncomingMessage,
  panel: vscode.WebviewPanel,
  client: CodeReviewClient,
  workspacePath: string,
  sidebarProvider: SidebarProvider,
  context: vscode.ExtensionContext,
  workflow: Awaited<ReturnType<typeof client.getWorkflow>>,
  isBuiltin: boolean,
  baseTitle: string
): Promise<void> {
  switch (message.command) {
    case 'ready':
      sendInitializeMessage(panel, workflow, isBuiltin);
      break;

    case 'save':
      await handleSaveWorkflow(message.data, panel, client, workspacePath, sidebarProvider);
      // Reset title after save (remove dirty indicator)
      panel.title = baseTitle;
      break;

    case 'duplicate':
      await handleDuplicateWorkflow(
        message.data,
        panel,
        client,
        workspacePath,
        sidebarProvider,
        context
      );
      break;

    case 'setDirty':
      // Update panel title to show dirty state
      panel.title = message.dirty ? `● ${baseTitle}` : baseTitle;
      break;
  }
}

/**
 * Send initialize message to webview
 */
function sendInitializeMessage(
  panel: vscode.WebviewPanel,
  workflow: Awaited<ReturnType<CodeReviewClient['getWorkflow']>>,
  isBuiltin: boolean
): void {
  if (!workflow) return;
  const initMessage: WorkflowEditorInitializeMessage = {
    command: 'initialize',
    data: {
      workflow,
      isReadonly: isBuiltin,
    },
  };
  panel.webview.postMessage(initMessage);
}

/**
 * Handle save workflow message
 */
async function handleSaveWorkflow(
  workflowData: WorkflowEditorIncomingMessage extends { command: 'save'; data: infer T }
    ? T
    : never,
  panel: vscode.WebviewPanel,
  client: CodeReviewClient,
  workspacePath: string,
  sidebarProvider: SidebarProvider
): Promise<void> {
  try {
    const updatedWorkflow = await client.updateWorkflow(workflowData, workspacePath);
    if (updatedWorkflow) {
      const savedMessage: WorkflowEditorSavedMessage = { command: 'saved' };
      panel.webview.postMessage(savedMessage);
      sidebarProvider.refresh();
      vscode.window.showInformationMessage(INFO_MESSAGES.WORKFLOW_SAVED);
    }
  } catch (error) {
    console.error('[WorkflowCommands] Failed to save workflow:', error);
    vscode.window.showErrorMessage(ERROR_MESSAGES.FAILED_TO_SAVE_WORKFLOW);
  }
}

/**
 * Handle duplicate workflow message
 */
async function handleDuplicateWorkflow(
  sourceWorkflow: WorkflowEditorIncomingMessage extends { command: 'duplicate'; data: infer T }
    ? T
    : never,
  panel: vscode.WebviewPanel,
  client: CodeReviewClient,
  workspacePath: string,
  sidebarProvider: SidebarProvider,
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    const newName = await vscode.window.showInputBox({
      prompt: UI_LABELS.DUPLICATE_WORKFLOW_PROMPT,
      value: `${sourceWorkflow.name} (Copy)`,
      validateInput: (value) => (value.trim() ? null : 'Name is required'),
    });

    if (!newName) return;

    const nodes: WorkflowNodeInput[] = sourceWorkflow.nodes.map((n) => ({
      name: n.name,
      content: n.content,
      order: n.order,
    }));

    const duplicatedWorkflow = await client.createWorkflow(
      {
        name: newName.trim(),
        description: sourceWorkflow.description ?? '',
        nodes,
      },
      workspacePath
    );

    if (duplicatedWorkflow) {
      sidebarProvider.refresh();
      panel.dispose();
      await openWorkflowEditor(
        context,
        client,
        duplicatedWorkflow.id,
        workspacePath,
        sidebarProvider
      );
      vscode.window.showInformationMessage(`Workflow duplicated: ${newName}`);
    }
  } catch (error) {
    console.error('[WorkflowCommands] Failed to duplicate workflow:', error);
    vscode.window.showErrorMessage(ERROR_MESSAGES.FAILED_TO_DUPLICATE_WORKFLOW);
  }
}
