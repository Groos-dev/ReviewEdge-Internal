/**
 * Git-related type definitions
 */

export interface GitCommit {
  readonly hash: string;
  readonly message: string;
  readonly author: string;
  readonly date: string;
}

export interface GitBranchSelection {
  readonly branch: string;
  readonly commit: GitCommit;
}

export interface TaskCreationParams {
  readonly name: string;
  readonly baseBranch: string;
  readonly baseCommit: string;
  readonly headBranch: string;
  readonly headCommit: string;
  readonly workflowId: string | null;
}
