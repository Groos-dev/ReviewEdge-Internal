export interface PromptNode {
  readonly id: string;
  readonly name: string;
  readonly content: string;
  readonly order: number;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface Workflow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly nodes: readonly PromptNode[];
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ReviewTask {
  readonly id: string;
  readonly name: string;
  readonly workspacePath: string;
  readonly baseBranch: string;
  readonly baseCommit: string;
  readonly headBranch: string;
  readonly headCommit: string;
  readonly workflowId: string | null;
  readonly createdAt: number;
  readonly updatedAt: number;
}

export interface ReviewComment {
  readonly id: string;
  readonly taskId: string;
  readonly filePath: string;
  readonly line: number;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly category: string;
  readonly comment: string;
  readonly suggestion?: string;
  readonly resolved?: boolean;
  readonly resolvedAt?: number;
  readonly resolvedBy?: string;
  readonly createdAt: number;
}
