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
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview')],
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
        case 'viewTaskDiff':
          await vscode.commands.executeCommand('mcpCodeReview.viewTaskDiff', message.id);
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
    const choice = await vscode.window.showQuickPick(
      [
        {
          label: '$(git-branch) Set Main Branch',
          description: 'Configure the main branch for code review',
          value: 'mainBranch',
        },
        {
          label: '$(plug) Configure MCP Server',
          description: 'Get configuration for Cursor MCP integration',
          value: 'mcpConfig',
        },
      ],
      {
        placeHolder: 'Select a setting to configure',
        title: 'MCP Code Review Settings',
      }
    );

    if (!choice) return;

    if (choice.value === 'mainBranch') {
      await this._setMainBranch();
    } else if (choice.value === 'mcpConfig') {
      await this._configureMcpServer();
    }
  }

  private async _setMainBranch(): Promise<void> {
    const currentBranch = vscode.workspace
      .getConfiguration('mcpCodeReview')
      .get<string>('mainBranch', 'main');

    const branches = await this._getGitBranches();

    if (branches.length === 0) {
      vscode.window.showWarningMessage('No git branches found in this workspace');
      return;
    }

    const items = branches.map((branch) => ({
      label: branch,
      description: branch === currentBranch ? '(current main branch)' : '',
      picked: branch === currentBranch,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select the main branch for this repository',
      title: 'Set Main Branch',
    });

    if (selected && selected.label !== currentBranch) {
      await vscode.workspace
        .getConfiguration('mcpCodeReview')
        .update('mainBranch', selected.label, vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(`Main branch set to: ${selected.label}`);
    }
  }

  private async _getNodePath(): Promise<string> {
    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);
      const command = process.platform === 'win32' ? 'where node' : 'which node';
      const { stdout } = await execAsync(command);
      const path = stdout.trim().split('\n')[0];
      return path && path.length > 0 ? path : 'node';
    } catch (e) {
      console.warn('[SidebarProvider] Failed to detect node path, falling back to "node"', e);
      return 'node';
    }
  }

  private async _configureMcpServer(): Promise<void> {
    let serverPath = vscode.Uri.joinPath(this._extensionUri, 'dist', 'server', 'index.js').fsPath;

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(serverPath));
    } catch {
      serverPath = vscode.Uri.joinPath(
        this._extensionUri,
        '..',
        'server',
        'dist',
        'index.js'
      ).fsPath;
    }

    const nodePath = await this._getNodePath();

    const config = {
      'mcp-codereview': {
        command: nodePath,
        args: [serverPath],
        disabled: false,
      },
    };

    const configJson = JSON.stringify(config, null, 2);

    const action = await vscode.window.showInformationMessage(
      'MCP Server 配置已生成。请将以下配置添加到 Cursor 的 MCP Settings 中。',
      'Copy Config',
      'Show Instructions'
    );

    if (action === 'Copy Config') {
      await vscode.env.clipboard.writeText(configJson);
      vscode.window.showInformationMessage(
        '配置已复制到剪贴板！请在 Cursor Settings → Features → MCP 中添加。'
      );
    } else if (action === 'Show Instructions') {
      const panel = vscode.window.createWebviewPanel(
        'mcpConfigInstructions',
        'MCP Server Configuration',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview')],
        }
      );

      panel.webview.html = this._getMcpSetupWebviewHtml(panel.webview, configJson, serverPath);

      // Handle messages from the webview
      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === 'ready') {
          panel.webview.postMessage({
            command: 'initialize',
            data: { configJson, serverPath },
          });
        } else if (message.command === 'copyConfig') {
          await vscode.env.clipboard.writeText(configJson);
          vscode.window.showInformationMessage('配置已复制到剪贴板！');
        }
      });
    }
  }

  private async _getGitBranches(): Promise<string[]> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      return [];
    }

    try {
      const { exec } = await import('node:child_process');
      const { promisify } = await import('node:util');
      const execAsync = promisify(exec);
      const { stdout } = await execAsync('git branch -a', { cwd: workspacePath });

      const branches = stdout
        .split('\n')
        .map((line) =>
          line
            .trim()
            .replace(/^\* /, '')
            .replace(/^remotes\/origin\//, '')
        )
        .filter((line) => line && !line.includes('HEAD ->'))
        .filter((value, index, self) => self.indexOf(value) === index);

      return branches;
    } catch (error) {
      console.error('[SidebarProvider] Failed to get branches:', error);
      return [];
    }
  }

  private _getMcpSetupWebviewHtml(
    webview: vscode.Webview,
    _configJson: string,
    _serverPath: string
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'mcpsetup', 'index.js')
    );

    const assetsDir = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets');
    const fs = require('node:fs');
    let cssUri = '';

    try {
      if (fs.existsSync(assetsDir.fsPath)) {
        const files = fs.readdirSync(assetsDir.fsPath);
        const cssFile = files.find(
          (file: string) => file.startsWith('ui-') && file.endsWith('.css')
        );
        if (cssFile) {
          cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsDir, cssFile)).toString();
        }
      }
    } catch (error) {
      console.error('[SidebarProvider] Failed to read CSS file:', error);
    }

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'codicons', 'codicon.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
  <title>MCP Server Configuration</title>
  <link rel="stylesheet" href="${codiconsUri}">
  ${cssUri ? `<link rel="stylesheet" href="${cssUri}">` : ''}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'sidebar', 'index.js')
    );

    const assetsDir = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets');
    const fs = require('node:fs');
    let cssUri = '';

    try {
      if (fs.existsSync(assetsDir.fsPath)) {
        const files = fs.readdirSync(assetsDir.fsPath);
        const cssFile = files.find(
          (file: string) => file.startsWith('ui-') && file.endsWith('.css')
        );
        if (cssFile) {
          cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsDir, cssFile)).toString();
        }
      }
    } catch (error) {
      console.error('[SidebarProvider] Failed to read CSS file:', error);
    }

    const codiconsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'codicons', 'codicon.css')
    );

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
  <title>MCP Code Review</title>
  <link rel="stylesheet" href="${codiconsUri}">
  ${cssUri ? `<link rel="stylesheet" href="${cssUri}">` : ''}
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
