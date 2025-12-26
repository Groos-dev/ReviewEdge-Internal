import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { isEmpty } from 'lodash';
import type { GitCommit } from '../types/git';

const execAsync = promisify(exec);

export class GitService {
  // TODO(security): Avoid string interpolation in shell commands.
  //   Prefer execFile/spawn with argument arrays to prevent quoting bugs and reduce injection risk.
  async getBranches(workspacePath: string): Promise<string[]> {
    try {
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
      console.error('[GitService] Failed to get branches:', error);
      throw new Error('Failed to get git branches. Is this a git repository?');
    }
  }

  /**
   * Get commits from a specific branch
   * @param workspacePath - The workspace path to execute git commands
   * @param branch - The branch name to get commits from
   * @param limit - Maximum number of commits to retrieve (default: 20)
   * @returns Array of GitCommit objects
   * @throws Error if failed to get commits
   */
  async getCommits(workspacePath: string, branch: string, limit = 20): Promise<GitCommit[]> {
    try {
      const { stdout } = await execAsync(
        `git log ${branch} --format=%H%n%s%n%an%n%ai%n--- -n ${limit}`,
        { cwd: workspacePath }
      );

      const commits: GitCommit[] = [];
      const lines = stdout.split('\n');

      for (let i = 0; i < lines.length; i += 5) {
        const line = lines[i];
        if (line && line !== '---') {
          commits.push({
            hash: line.trim(),
            message: lines[i + 1]?.trim() || '',
            author: lines[i + 2]?.trim() || '',
            date: lines[i + 3]?.trim() || '',
          });
        }
      }

      return commits;
    } catch (error) {
      console.error('[GitService] Failed to get commits:', error);
      throw new Error(`Failed to get commits for branch: ${branch}`);
    }
  }

  /**
   * Get the current branch name
   * @param workspacePath - The workspace path to execute git commands
   * @returns Current branch name
   * @throws Error if failed to get current branch
   */
  async getCurrentBranch(workspacePath: string): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current', { cwd: workspacePath });
      return stdout.trim();
    } catch (error) {
      console.error('[GitService] Failed to get current branch:', error);
      throw new Error('Failed to get current branch');
    }
  }

  /**
   * Get the latest commit from a specific branch
   * @param workspacePath - The workspace path to execute git commands
   * @param branch - The branch name to get the latest commit from
   * @returns The latest GitCommit object
   * @throws Error if no commits found
   */
  async getLatestCommit(workspacePath: string, branch: string): Promise<GitCommit> {
    const commits = await this.getCommits(workspacePath, branch, 1);
    const latestCommit = commits[0];
    if (isEmpty(latestCommit)) {
      throw new Error(`No commits found for branch: ${branch}`);
    }
    return latestCommit;
  }

  /**
   * Validate if a path is a git repository
   * @param workspacePath - The workspace path to validate
   * @returns true if it's a valid git repository
   */
  async isGitRepository(workspacePath: string): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: workspacePath });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get git diff between two commits
   * @param workspacePath - The workspace path to execute git commands
   * @param baseCommit - The base commit hash
   * @param headCommit - The head commit hash
   * @returns Git diff output string
   * @throws Error if failed to get diff
   */
  async getDiff(workspacePath: string, baseCommit: string, headCommit: string): Promise<string> {
    try {
      const { stdout } = await execAsync(`git diff ${baseCommit}..${headCommit}`, {
        cwd: workspacePath,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large diffs
      });
      return stdout;
    } catch (error) {
      console.error('[GitService] Failed to get diff:', error);
      throw new Error(`Failed to get diff between ${baseCommit} and ${headCommit}`);
    }
  }

  /**
   * Get changed files between two commits
   * @param workspacePath - The workspace path to execute git commands
   * @param baseCommit - The base commit hash
   * @param headCommit - The head commit hash
   * @returns Array of changed file paths
   * @throws Error if failed to get changed files
   */
  async getChangedFiles(
    workspacePath: string,
    baseCommit: string,
    headCommit: string
  ): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`git diff --name-only ${baseCommit}..${headCommit}`, {
        cwd: workspacePath,
      });
      return stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch (error) {
      console.error('[GitService] Failed to get changed files:', error);
      throw new Error(`Failed to get changed files between ${baseCommit} and ${headCommit}`);
    }
  }
}
