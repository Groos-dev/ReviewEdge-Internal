import * as vscode from 'vscode';
import type { SidebarProvider } from '../providers/SidebarProvider';
import type { GitCommit, TaskCreationParams } from '../types/git';
import type { CodeReviewClient } from './CodeReviewClient';
import { GitService } from './GitService';

/**
 * Service for Task management
 * Handles task creation, editing, and workflow selection
 */
export class TaskService {
  private readonly gitService: GitService;

  constructor() {
    this.gitService = new GitService();
  }

  /**
   * Create a new review task with user interaction
   * @param client - CodeReviewClient instance
   * @param sidebarProvider - SidebarProvider instance for refreshing UI
   */
  async createTask(client: CodeReviewClient, sidebarProvider: SidebarProvider): Promise<void> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    try {
      const isGitRepo = await this.gitService.isGitRepository(workspacePath);
      if (!isGitRepo) {
        vscode.window.showErrorMessage('Current workspace is not a git repository');
        return;
      }

      const mode = await vscode.window.showQuickPick(
        [
          {
            label: '$(zap) Quick Create',
            description: 'Current branch → Main branch (latest commits)',
            value: 'simple',
          },
          {
            label: '$(settings-gear) Advanced',
            description: 'Manually select branches and commits',
            value: 'advanced',
          },
        ],
        {
          placeHolder: 'Select creation mode',
          title: 'Create Review Task',
        }
      );

      if (!mode) return;

      if (mode.value === 'simple') {
        await this.createSimpleTask(client, workspacePath, sidebarProvider);
      } else {
        await this.createAdvancedTask(client, workspacePath, sidebarProvider);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to create task: ${message}`);
    }
  }

  /**
   * Create a task using simple mode (current branch vs main branch)
   * @param client - CodeReviewClient instance
   * @param workspacePath - Workspace path
   * @param sidebarProvider - SidebarProvider instance for refreshing UI
   */
  private async createSimpleTask(
    client: CodeReviewClient,
    workspacePath: string,
    sidebarProvider: SidebarProvider
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('mcpCodeReview');
    const mainBranch = config.get<string>('mainBranch', 'main');
    const currentBranch = await this.gitService.getCurrentBranch(workspacePath);

    if (currentBranch === mainBranch) {
      const proceed = await vscode.window.showWarningMessage(
        `You are on the main branch (${mainBranch}). Do you want to continue with Advanced mode?`,
        'Advanced Mode',
        'Cancel'
      );
      if (proceed === 'Advanced Mode') {
        await this.createAdvancedTask(client, workspacePath, sidebarProvider);
      }
      return;
    }

    let baseCommit: GitCommit;
    let headCommit: GitCommit;

    try {
      baseCommit = await this.gitService.getLatestCommit(workspacePath, mainBranch);
    } catch {
      vscode.window.showErrorMessage(
        `Main branch "${mainBranch}" not found. Please set the correct main branch in settings.`
      );
      return;
    }

    try {
      headCommit = await this.gitService.getLatestCommit(workspacePath, currentBranch);
    } catch {
      vscode.window.showErrorMessage(`Failed to get commits for current branch: ${currentBranch}`);
      return;
    }

    const params: TaskCreationParams = {
      name: `Review ${currentBranch} → ${mainBranch}`,
      baseBranch: mainBranch,
      baseCommit: baseCommit.hash,
      headBranch: currentBranch,
      headCommit: headCommit.hash,
      workflowId: null,
    };

    const task = await client.createTask(params, workspacePath);

    if (!task) {
      vscode.window.showErrorMessage('Failed to create task');
      return;
    }

    sidebarProvider.refresh();

    vscode.window.showInformationMessage(
      `Task created: ${currentBranch} (${headCommit.hash.substring(0, 7)}) → ${mainBranch} (${baseCommit.hash.substring(0, 7)})`
    );
  }

  /**
   * Create a task using advanced mode (manually select branches and commits)
   * @param client - CodeReviewClient instance
   * @param workspacePath - Workspace path
   * @param sidebarProvider - SidebarProvider instance for refreshing UI
   */
  private async createAdvancedTask(
    client: CodeReviewClient,
    workspacePath: string,
    sidebarProvider: SidebarProvider
  ): Promise<void> {
    const branches = await this.gitService.getBranches(workspacePath);

    // Step 1: Select base branch
    const baseBranch = await vscode.window.showQuickPick(branches, {
      placeHolder: 'Select base branch (target branch)',
      title: 'Step 1/4: Select Base Branch',
    });
    if (!baseBranch) return;

    // Step 2: Select base commit
    const baseCommit = await this.selectCommit(
      workspacePath,
      baseBranch,
      'Step 2/4: Select Base Commit'
    );
    if (!baseCommit) return;

    // Step 3: Select head branch
    const headBranch = await vscode.window.showQuickPick(branches, {
      placeHolder: 'Select head branch (branch to review)',
      title: 'Step 3/4: Select Head Branch',
    });
    if (!headBranch) return;

    // Step 4: Select head commit
    const headCommit = await this.selectCommit(
      workspacePath,
      headBranch,
      'Step 4/4: Select Head Commit'
    );
    if (!headCommit) return;

    const params: TaskCreationParams = {
      name: `Review ${headBranch} → ${baseBranch}`,
      baseBranch,
      baseCommit: baseCommit.hash,
      headBranch,
      headCommit: headCommit.hash,
      workflowId: null,
    };

    const task = await client.createTask(params, workspacePath);

    if (!task) {
      vscode.window.showErrorMessage('Failed to create task');
      return;
    }

    sidebarProvider.refresh();
    vscode.window.showInformationMessage(`Task created: ${task.name}`);
  }

  /**
   * Helper method to select a commit from a branch
   * @param workspacePath - Workspace path
   * @param branch - Branch name to get commits from
   * @param title - Title for the quick pick dialog
   * @returns Selected GitCommit or undefined if cancelled
   */
  private async selectCommit(
    workspacePath: string,
    branch: string,
    title: string
  ): Promise<GitCommit | undefined> {
    const commits = await this.gitService.getCommits(workspacePath, branch);
    const commitItems = commits.map((commit) => ({
      label: commit.hash.substring(0, 7),
      description: commit.message,
      detail: `${commit.author} - ${commit.date}`,
      commit,
    }));

    const selected = await vscode.window.showQuickPick(commitItems, {
      placeHolder: 'Select commit',
      title,
    });

    return selected?.commit;
  }

  /**
   * Edit an existing task
   * @param client - CodeReviewClient instance
   * @param taskId - Task ID to edit
   * @param sidebarProvider - SidebarProvider instance for refreshing UI
   */
  async editTask(
    client: CodeReviewClient,
    taskId: string,
    sidebarProvider: SidebarProvider
  ): Promise<void> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    try {
      const task = await client.getTask(taskId, workspacePath);
      if (!task) {
        vscode.window.showErrorMessage(`Task not found: ${taskId}`);
        return;
      }

      const isGitRepo = await this.gitService.isGitRepository(workspacePath);
      if (!isGitRepo) {
        vscode.window.showErrorMessage('Current workspace is not a git repository');
        return;
      }

      const editChoice = await vscode.window.showQuickPick(
        [
          { label: '$(git-branch) Edit Base Branch & Commit', value: 'base' },
          { label: '$(git-branch) Edit Head Branch & Commit', value: 'head' },
          { label: '$(edit) Edit Task Name', value: 'name' },
        ],
        {
          placeHolder: 'What do you want to edit?',
          title: `Edit Task: ${task.name}`,
        }
      );

      if (!editChoice) return;

      vscode.window.showInformationMessage('Edit task functionality - implementation pending');
      sidebarProvider.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to edit task: ${message}`);
    }
  }

  /**
   * Select a workflow for a task
   * @param client - CodeReviewClient instance
   * @param taskId - Task ID to select workflow for
   * @param sidebarProvider - SidebarProvider instance for refreshing UI
   */
  async selectWorkflowForTask(
    client: CodeReviewClient,
    taskId: string,
    sidebarProvider: SidebarProvider
  ): Promise<void> {
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspacePath) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    try {
      const task = await client.getTask(taskId, workspacePath);
      if (!task) {
        vscode.window.showErrorMessage(`Task not found: ${taskId}`);
        return;
      }

      const workflows = await client.listWorkflows(workspacePath);
      if (workflows.length === 0) {
        vscode.window.showWarningMessage('No workflows available. Create a workflow first.');
        return;
      }

      const items = workflows.map((w) => ({
        label: w.id === task.workflowId ? `$(check) ${w.name}` : w.name,
        description: `${w.nodes.length} step(s)`,
        detail: w.description || undefined,
        workflow: w,
      }));

      if (task.workflowId) {
        items.unshift({
          label: '$(close) Remove workflow',
          description: 'Run task without workflow',
          detail: undefined,
          workflow: null as any,
        });
      }

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a workflow for this task',
        title: `Select Workflow for: ${task.name}`,
      });

      if (!selected) return;

      vscode.window.showInformationMessage(
        'Select workflow functionality - implementation pending'
      );
      sidebarProvider.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to select workflow: ${message}`);
    }
  }
}
