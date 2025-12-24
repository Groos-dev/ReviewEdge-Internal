import { z } from 'zod';

// ============================================================================
// Severity & Workflow Types
// ============================================================================

export const SeverityLevel = z.enum(['INFO', 'WARNING', 'CRITICAL']);
export type SeverityLevel = z.infer<typeof SeverityLevel>;

export const WorkflowType = z.enum(['security', 'performance', 'idiomatic']);
export type WorkflowType = z.infer<typeof WorkflowType>;

export const ReviewStatus = z.enum(['pending', 'processing', 'completed', 'failed']);
export type ReviewStatus = z.infer<typeof ReviewStatus>;

// ============================================================================
// Review Item Schema
// ============================================================================

export const ReviewItemSchema = z.object({
  file: z.string().min(1),
  line: z.number().int().positive(),
  severity: SeverityLevel,
  category: z.string().min(1),
  comment: z.string().min(1),
  suggestion: z.string().optional(),
});
export type ReviewItem = z.infer<typeof ReviewItemSchema>;

// ============================================================================
// Review Request Schemas
// ============================================================================

export const ReviewRequestSchema = z.object({
  diff: z.string().min(1),
  workspacePath: z.string().optional(),
  options: z
    .object({
      fileFilters: z.array(z.string()).optional(),
      maxLines: z.number().int().positive().optional(),
      severityThreshold: SeverityLevel.optional(),
    })
    .optional(),
});
export type ReviewRequest = z.infer<typeof ReviewRequestSchema>;

// ============================================================================
// Review Response Schemas
// ============================================================================

export const ReviewResponseSchema = z.object({
  reviews: z.array(ReviewItemSchema),
});
export type ReviewResponse = z.infer<typeof ReviewResponseSchema>;

export const ReviewResultSchema = z.object({
  reviewId: z.string().uuid(),
  status: ReviewStatus,
  workflowType: WorkflowType,
  reviews: z.array(ReviewItemSchema),
  summary: z.string().optional(),
  executionTimeMs: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});
export type ReviewResult = z.infer<typeof ReviewResultSchema>;

// ============================================================================
// MCP Tool Input Schemas
// ============================================================================

export const DiffInputSchema = z.object({
  diff: z.string().min(1, 'Diff content is required'),
});
export type DiffInput = z.infer<typeof DiffInputSchema>;

export const CodeReviewInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  step: z.number().int().min(0, 'Step must be a non-negative integer'),
  workspacePath: z.string().min(1, 'Workspace path is required'),
});
export type CodeReviewInput = z.infer<typeof CodeReviewInputSchema>;

export const CommentSeverity = z.enum(['INFO', 'WARNING', 'CRITICAL']);
export type CommentSeverity = z.infer<typeof CommentSeverity>;

export const AddCommentInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  workspacePath: z.string().min(1, 'Workspace path is required'),
  filePath: z.string().min(1, 'File path is required'),
  line: z.number().int().positive('Line must be a positive integer'),
  severity: CommentSeverity,
  category: z.string().min(1, 'Category is required'),
  comment: z.string().min(1, 'Comment is required'),
  suggestion: z.string().optional(),
});
export type AddCommentInput = z.infer<typeof AddCommentInputSchema>;

export const AddCommentsInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  workspacePath: z.string().min(1, 'Workspace path is required'),
  comments: z
    .array(
      z.object({
        filePath: z.string().min(1),
        line: z.number().int().positive(),
        severity: CommentSeverity,
        category: z.string().min(1),
        comment: z.string().min(1),
        suggestion: z.string().optional(),
      })
    )
    .min(1, 'At least one comment is required'),
});
export type AddCommentsInput = z.infer<typeof AddCommentsInputSchema>;

export const ListWorkflowsInputSchema = z.object({
  workspacePath: z.string().min(1, 'Workspace path is required'),
});
export type ListWorkflowsInput = z.infer<typeof ListWorkflowsInputSchema>;

export const ListTasksInputSchema = z.object({
  workspacePath: z.string().min(1, 'Workspace path is required'),
});
export type ListTasksInput = z.infer<typeof ListTasksInputSchema>;

export const GetTaskInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  workspacePath: z.string().min(1, 'Workspace path is required'),
});
export type GetTaskInput = z.infer<typeof GetTaskInputSchema>;

export const DeleteTaskInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  workspacePath: z.string().min(1, 'Workspace path is required'),
});
export type DeleteTaskInput = z.infer<typeof DeleteTaskInputSchema>;

export const CreateTaskInputSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  baseBranch: z.string().min(1, 'Base branch is required'),
  baseCommit: z.string().min(1, 'Base commit is required'),
  headBranch: z.string().min(1, 'Head branch is required'),
  headCommit: z.string().min(1, 'Head commit is required'),
  workflowId: z.string().nullable().optional(),
  workspacePath: z.string().min(1, 'Workspace path is required'),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;

export const GetCommentsByTaskInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  workspacePath: z.string().min(1, 'Workspace path is required'),
});
export type GetCommentsByTaskInput = z.infer<typeof GetCommentsByTaskInputSchema>;

// ============================================================================
// Validation Utilities
// ============================================================================

export function parseSchema<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeParseSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
