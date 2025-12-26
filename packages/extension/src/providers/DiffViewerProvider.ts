import * as fs from 'node:fs';
import * as vscode from 'vscode';
import type { ReviewComment, ReviewTask } from '../../../ui/src/types/config';
import type { CodeReviewClient } from '../services/CodeReviewClient';
import type { GitService } from '../services/GitService';

interface DiffFileInfo {
  fileName: string;
  fileLang: string;
  content?: string;
}

interface DiffFileData {
  newFile: DiffFileInfo;
  oldFile: DiffFileInfo;
  hunks: string[];
  oldPath: string;
  newPath: string;
}

interface DiffResponse {
  files: DiffFileData[];
  comments: ReviewComment[];
}

// Mock comments for testing.
// TODO(refactor): Remove mock comments from production code paths or gate behind a user setting.
//   Current behavior can render fake comments and hide real integration issues.
const USE_MOCK_COMMENTS = true;

function generateMockComments(files: DiffFileData[], taskId: string): ReviewComment[] {
  if (!USE_MOCK_COMMENTS || files.length === 0) {
    return [];
  }

  const mockComments: ReviewComment[] = [];
  const severities: Array<'INFO' | 'WARNING' | 'CRITICAL'> = ['INFO', 'WARNING', 'CRITICAL'];
  const categories = ['Security', 'Performance', 'Code Style', 'Best Practices', 'Bug'];

  const mockMessages = [
    {
      comment: 'Consider using const instead of let for immutable variables.',
      suggestion: 'const value = getData();',
    },
    {
      comment:
        'This function has high cyclomatic complexity. Consider breaking it into smaller functions.',
      suggestion: undefined,
    },
    {
      comment: 'Potential SQL injection vulnerability. Use parameterized queries.',
      suggestion: 'db.query("SELECT * FROM users WHERE id = ?", [userId])',
    },
    {
      comment: 'Missing error handling for async operation.',
      suggestion: 'try {\n  await fetchData();\n} catch (error) {\n  handleError(error);\n}',
    },
    { comment: 'This variable is declared but never used.', suggestion: undefined },
    {
      comment: 'Consider adding input validation here.',
      suggestion:
        'if (!input || typeof input !== "string") {\n  throw new Error("Invalid input");\n}',
    },
  ];

  // Generate 1-3 comments for each file
  for (const file of files) {
    const filePath = file.newPath || file.oldPath;
    if (!filePath) continue;

    const commentCount = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < commentCount; i++) {
      const msgIndex = Math.floor(Math.random() * mockMessages.length);
      const msg = mockMessages[msgIndex];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      if (!msg || !severity || !category) continue;
      mockComments.push({
        id: `mock-${filePath}-${i}`,
        taskId,
        filePath,
        line: Math.floor(Math.random() * 50) + 1,
        severity,
        category,
        comment: msg.comment,
        suggestion: msg.suggestion,
        createdAt: Date.now(),
      });
    }
  }

  return mockComments;
}

const EXTENSION_LANG_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  json: 'json',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  vue: 'vue',
  py: 'python',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  md: 'markdown',
  sql: 'sql',
  sh: 'bash',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
};

export class DiffViewerProvider {
  private static currentPanel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly gitService: GitService,
    private readonly codeReviewClient: CodeReviewClient
  ) {}

  public async showDiff(task: ReviewTask, workspacePath: string): Promise<void> {
    const columnToShowIn = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (DiffViewerProvider.currentPanel) {
      DiffViewerProvider.currentPanel.reveal(columnToShowIn);
    } else {
      DiffViewerProvider.currentPanel = vscode.window.createWebviewPanel(
        'mcpCodeReview.diffViewer',
        `Diff: ${task.name}`,
        columnToShowIn || vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview')],
        }
      );

      DiffViewerProvider.currentPanel.webview.html = this._getHtmlForWebview(
        DiffViewerProvider.currentPanel.webview
      );

      DiffViewerProvider.currentPanel.onDidDispose(() => {
        DiffViewerProvider.currentPanel = undefined;
      });
    }

    // Handle messages from webview
    DiffViewerProvider.currentPanel.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'ready':
          await this._loadDiffData(task, workspacePath);
          break;
        case 'gotoLine':
          await this._handleGotoLine(message, workspacePath);
          break;
      }
    });

    // Load diff data
    await this._loadDiffData(task, workspacePath);
  }

  private async _handleGotoLine(
    message: { filePath: string; line: number; side: 'old' | 'new' },
    workspacePath: string
  ): Promise<void> {
    try {
      const { filePath, line, side } = message;

      // For now, only support 'new' side (current worktree files)
      if (side === 'old') {
        // TODO: Implement old side navigation with TextDocumentContentProvider
        // to show historical version of the file
        vscode.window.showInformationMessage('跳转到历史版本功能开发中');
        return;
      }

      // Construct the full file path
      const fullPath = vscode.Uri.joinPath(vscode.Uri.file(workspacePath), filePath);

      // Check if file exists
      try {
        await vscode.workspace.fs.stat(fullPath);
      } catch {
        vscode.window.showWarningMessage(`文件不存在: ${filePath}`);
        return;
      }

      // Open the file
      const document = await vscode.workspace.openTextDocument(fullPath);
      const editor = await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.One,
        preserveFocus: false,
      });

      // Navigate to the line (line numbers are 1-based, VS Code positions are 0-based)
      const lineIndex = Math.max(0, line - 1);
      const lineLength = document.lineAt(lineIndex).text.length;
      const range = new vscode.Range(lineIndex, 0, lineIndex, lineLength);

      // Reveal the line and set cursor
      editor.selection = new vscode.Selection(lineIndex, 0, lineIndex, 0);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);

      console.log(`[DiffViewerProvider] Navigated to ${filePath}:${line}`);
    } catch (error) {
      console.error('[DiffViewerProvider] Failed to navigate:', error);
      vscode.window.showErrorMessage(
        `无法跳转到文件: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async _loadDiffData(task: ReviewTask, workspacePath: string): Promise<void> {
    if (!DiffViewerProvider.currentPanel) {
      return;
    }

    try {
      // Get git diff and comments in parallel
      const [diffOutput, comments] = await Promise.all([
        this.gitService.getDiff(workspacePath, task.baseCommit, task.headCommit),
        this.codeReviewClient.getCommentsByTask(task.id, workspacePath),
      ]);

      if (!diffOutput) {
        DiffViewerProvider.currentPanel.webview.postMessage({
          command: 'error',
          message: 'No diff data available',
        });
        return;
      }

      // Parse diff output and include comments
      const diffData = await this._parseDiff(diffOutput, comments, task.id, workspacePath);

      console.log(
        `[DiffViewerProvider] Loaded ${diffData.files.length} files, ${diffData.comments.length} comments`
      );

      // Send to webview
      DiffViewerProvider.currentPanel.webview.postMessage({
        command: 'setDiffData',
        data: diffData,
      });
    } catch (error) {
      console.error('[DiffViewerProvider] Failed to load diff:', error);
      DiffViewerProvider.currentPanel.webview.postMessage({
        command: 'error',
        message: error instanceof Error ? error.message : 'Failed to load diff',
      });
    }
  }

  private async _parseDiff(
    diffOutput: string,
    comments: ReviewComment[],
    taskId: string,
    workspacePath: string
  ): Promise<DiffResponse> {
    const files: DiffFileData[] = [];
    const fileDiffs = diffOutput.split(/(?=diff --git )/);

    for (const fileDiff of fileDiffs) {
      if (!fileDiff.trim() || !fileDiff.startsWith('diff --git')) {
        continue;
      }

      const firstLine = fileDiff.split('\n')[0];
      if (!firstLine) continue;

      const match = firstLine.match(/diff --git a\/(.*?) b\/(.*)/);

      let oldPath = '';
      let newPath = '';

      if (match?.[1] && match[2]) {
        oldPath = match[1];
        newPath = match[2];
      } else {
        const parts = firstLine.substring(11).split(' b/');
        const firstPart = parts[0];
        if (parts.length >= 2 && firstPart) {
          oldPath = firstPart.substring(2);
          newPath = parts.slice(1).join(' b/');
        }
      }

      if (oldPath || newPath) {
        const ext = (newPath || oldPath).split('.').pop()?.toLowerCase() || '';
        const fileLang = EXTENSION_LANG_MAP[ext] || ext;

        // Read the current file content from workspace (for newFile)
        let newFileContent: string | undefined;
        if (newPath) {
          try {
            const fullPath = vscode.Uri.joinPath(vscode.Uri.file(workspacePath), newPath);
            const fileData = await vscode.workspace.fs.readFile(fullPath);
            newFileContent = Buffer.from(fileData).toString('utf-8');
          } catch {
            // File might be deleted or not accessible
            console.log(`[DiffViewerProvider] Could not read file content: ${newPath}`);
          }
        }

        files.push({
          newFile: {
            fileName: newPath || oldPath,
            fileLang,
            content: newFileContent,
          },
          oldFile: {
            fileName: oldPath || newPath,
            fileLang,
            // Note: oldFile content would require git show, skipping for now
          },
          hunks: [fileDiff],
          oldPath,
          newPath,
        });
      }
    }

    console.log('[DiffViewerProvider] Parsed files:', files.length);
    for (const [i, f] of files.entries()) {
      console.log(
        `File ${i}: ${f.newPath}, diff length: ${f.hunks[0]?.length || 0}, hasContent: ${!!f.newFile.content}`
      );
    }

    // Use mock comments if enabled and no real comments exist
    const finalComments =
      USE_MOCK_COMMENTS && comments.length === 0 ? generateMockComments(files, taskId) : comments;

    return { files, comments: finalComments };
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'diffviewer', 'index.js')
    );

    const assetsDir = vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'assets');
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
      console.error('[DiffViewerProvider] Failed to read CSS file:', error);
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
  <title>Git Diff Viewer</title>
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
