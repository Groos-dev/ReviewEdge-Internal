import * as vscode from 'vscode';
import type { ReviewTask, Workflow } from '../../../ui/src/types/config';
import type { CodeReviewClient } from '../services/CodeReviewClient';

export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'mcpCodeReview.sidebarView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly client: CodeReviewClient
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
    this._setWebviewMessageListener(webviewView.webview);
    this.refresh();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this.refresh();
      }
    });
  }

  public async refresh(): Promise<void> {
    if (this._view) {
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspacePath) {
        return;
      }

      let workflows: Workflow[] = [];
      let tasks: ReviewTask[] = [];
      try {
        workflows = await this.client.listWorkflows(workspacePath);
        tasks = await this.client.listTasks(workspacePath);
      } catch (error) {
        console.error('[SidebarProvider] Failed to refresh:', error);
        // Continue with empty arrays
      }
      this._view.webview.postMessage({
        command: 'refresh',
        data: { workflows, tasks },
      });
    }
  }

  private _setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'createWorkflow':
          await vscode.commands.executeCommand('mcpCodeReview.createWorkflow');
          break;
        case 'openWorkflow':
          await vscode.commands.executeCommand('mcpCodeReview.openWorkflow', message.id);
          break;
        case 'deleteWorkflow':
          await vscode.commands.executeCommand('mcpCodeReview.deleteWorkflow', message.id);
          break;
        case 'createTask':
          await vscode.commands.executeCommand('mcpCodeReview.createTask');
          this.refresh();
          break;
        case 'openTask':
          await vscode.commands.executeCommand('mcpCodeReview.openTask', message.id);
          break;
        case 'editTask':
          await vscode.commands.executeCommand('mcpCodeReview.editTask', message.id);
          this.refresh();
          break;
        case 'selectWorkflowForTask':
          await vscode.commands.executeCommand('mcpCodeReview.selectWorkflowForTask', message.id);
          this.refresh();
          break;
        case 'deleteTask': {
          const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (!workspacePath) {
            vscode.window.showErrorMessage('No workspace folder found');
            break;
          }

          const task = await this.client.getTask(message.id, workspacePath);
          if (!task) {
            vscode.window.showErrorMessage(`Task not found: ${message.id}`);
            break;
          }

          const confirm = await vscode.window.showWarningMessage(
            `Delete task "${task.name}" and all its review comments?`,
            { modal: true },
            'Delete'
          );

          if (confirm === 'Delete') {
            await this.client.deleteTask(message.id, workspacePath);
            this.refresh();
            vscode.window.showInformationMessage(`Task deleted: ${task.name}`);
          }
          break;
        }
        case 'runTask':
          await this._runTask(message.id);
          break;
        case 'openSettings':
          await this._openSettings();
          break;
      }
    });
  }

  private async _runTask(taskId: string): Promise<void> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    let task: ReviewTask | null = null;
    try {
      task = await this.client.getTask(taskId, workspacePath);
    } catch {
      vscode.window.showErrorMessage('Failed to load task');
      return;
    }
    if (!task) {
      vscode.window.showErrorMessage('Task not found');
      return;
    }

    if (!task.workflowId) {
      vscode.window.showWarningMessage('请先为此任务选择一个 Workflow');
      return;
    }

    const instruction = `使用 codereview 工具开始代码评审，参数：taskId="${taskId}", step=0, workspacePath="${workspacePath}"`;

    await vscode.env.clipboard.writeText(instruction);

    vscode.window.showInformationMessage(
      '已复制指令到剪贴板，请在 Cursor 中粘贴执行以开始评审',
      'OK'
    );
  }

  private async _openSettings(): Promise<void> {
    // Settings implementation
    vscode.commands.executeCommand('workbench.action.openSettings', 'mcpCodeReview');
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'sidebar', 'index.global.js')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src 'unsafe-inline' ${webview.cspSource};">
  <title>Sidebar</title>
</head>
<body>
  <div id="root"></div>
  <script src="${scriptUri}"></script>
</body>
</html>`;
  }
}
