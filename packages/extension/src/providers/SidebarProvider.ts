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
          console.log('[SidebarProvider] viewTaskDiff received, id:', message.id);
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
        {}
      );

      panel.webview.html = this._getMcpInstructionsHtml(configJson, serverPath);
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

  private _getMcpInstructionsHtml(configJson: string, serverPath: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MCP Server Configuration</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }
    h1 { color: #007acc; }
    h2 { color: #333; margin-top: 30px; }
    pre {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      border: 1px solid #ddd;
    }
    code {
      background: #f5f5f5;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    .step {
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border-left: 4px solid #007acc;
    }
    .note {
      background: #fff3cd;
      padding: 10px;
      border-radius: 5px;
      border-left: 4px solid #ffc107;
      margin: 15px 0;
    }
    button {
      background: #007acc;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover {
      background: #005a9e;
    }
  </style>
</head>
<body>
  <h1>🔧 MCP Server Configuration</h1>

  <div class="note">
    <strong>📋 配置已准备就绪！</strong> 按照以下步骤将 MCP Server 添加到 Cursor。
  </div>

  <div class="step">
    <h2>步骤 1: 复制配置</h2>
    <p>点击下方按钮复制配置到剪贴板：</p>
    <button onclick="copyConfig()">📋 复制配置</button>
    <pre id="config">${this._escapeHtml(configJson)}</pre>
  </div>

  <div class="step">
    <h2>步骤 2: 打开 Cursor MCP 设置</h2>
    <p>在 Cursor 中：</p>
    <ol>
      <li>打开 <code>Cursor Settings</code> (⌘+, 或 Ctrl+,)</li>
      <li>导航到 <code>Features → MCP</code></li>
      <li>或直接搜索 "MCP"</li>
    </ol>
  </div>

  <div class="step">
    <h2>步骤 3: 添加配置</h2>
    <p>将复制的配置粘贴到 MCP Settings 的 JSON 配置中。</p>
  </div>

  <div class="step">
    <h2>步骤 4: 重启 Cursor</h2>
    <p>重启 Cursor 以使配置生效。</p>
  </div>

  <div class="note">
    <strong>💡 提示：</strong> Server 路径为 <code>${this._escapeHtml(serverPath)}</code>
  </div>

  <h2>验证安装</h2>
  <p>在 Cursor 的聊天窗口中，输入 <code>@</code> 并查看是否出现 MCP 工具（如 <code>codereview</code>、<code>add_review_comment</code> 等）。</p>

  <script>
    function copyConfig() {
      const config = document.getElementById('config').textContent;
      navigator.clipboard.writeText(config).then(() => {
        alert('配置已复制到剪贴板！');
      });
    }
  </script>
</body>
</html>`;
  }

  private _escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
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
