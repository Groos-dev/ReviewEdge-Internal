export type ReviewSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type ReviewWorkflowType = 'security' | 'performance' | 'idiomatic';
export type ReviewStatusType = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReviewItem {
  readonly id?: string;
  readonly file: string;
  readonly line: number;
  readonly severity: ReviewSeverity;
  readonly category: string;
  readonly comment: string;
  readonly suggestion?: string;
}

export interface ReviewResponse {
  readonly reviews: readonly ReviewItem[];
}

export interface ReviewResult {
  readonly reviewId: string;
  readonly status: ReviewStatusType;
  readonly workflowType: ReviewWorkflowType;
  readonly reviews: readonly ReviewItem[];
  readonly summary?: string;
  readonly executionTimeMs: number;
  readonly createdAt: string;
}

export interface CodeReviewParams {
  readonly workspacePath: string;
  readonly sourceBranch: string;
  readonly targetBranch: string;
  readonly promptTemplate?: string;
  readonly fileFilters?: readonly string[];
  readonly severityLevel?: ReviewSeverity;
}
