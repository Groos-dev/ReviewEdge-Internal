#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { taskReader } from './database/TaskReader.js';
import { errorHandler } from './errors/ErrorHandler.js';
import { McpError, McpErrorCodes } from './errors/McpErrors.js';
import {
  type AddCommentInput,
  AddCommentInputSchema,
  type AddCommentsInput,
  AddCommentsInputSchema,
  type CodeReviewInput,
  CodeReviewInputSchema,
} from './schemas.js';
import type { ReviewComment, ReviewTask } from './types/review.js';

// ============================================================================
// Tool Definitions
// ============================================================================

interface CommentInput {
  readonly taskId: string;
  readonly filePath: string;
  readonly line: number;
  readonly severity: string;
  readonly category: string;
  readonly comment: string;
  readonly suggestion?: string | null;
}

function computeReviewCommentId(input: CommentInput): string {
  const normalized = {
    taskId: input.taskId,
    filePath: input.filePath,
    line: input.line,
    severity: input.severity,
    category: input.category,
    comment: input.comment,
    suggestion: input.suggestion ?? null,
  };

  const hash = createHash('sha256').update(JSON.stringify(normalized)).digest('hex').slice(0, 24);

  return `comment-${hash}`;
}

// Tool Definition Type (MCP SDK compatible)
interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

const TOOL_DEFINITIONS: readonly ToolDefinition[] = [
  {
    name: 'codereview',
    description: 'Get code review task prompt. Returns the prompt for the current review step.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The review task ID' },
        step: { type: 'number', description: 'Current step index (0-based)' },
        workspacePath: { type: 'string', description: 'Path to the workspace' },
      },
      required: ['taskId', 'step', 'workspacePath'],
    },
  },
  {
    name: 'add_review_comment',
    description: 'Add a single review comment to a file. The comment will be rendered in VS Code.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The review task ID' },
        workspacePath: { type: 'string', description: 'Path to the workspace' },
        filePath: { type: 'string', description: 'Relative path to the file' },
        line: { type: 'number', description: 'Line number (1-based)' },
        severity: {
          type: 'string',
          enum: ['INFO', 'WARNING', 'CRITICAL'],
          description: 'Severity level of the comment',
        },
        category: {
          type: 'string',
          description: 'Category of the issue (e.g., Security, Performance, Style)',
        },
        comment: { type: 'string', description: 'The review comment' },
        suggestion: { type: 'string', description: 'Optional code suggestion' },
      },
      required: ['taskId', 'workspacePath', 'filePath', 'line', 'severity', 'category', 'comment'],
    },
  },
  {
    name: 'add_review_comments',
    description: 'Add multiple review comments at once. Use this for batch adding comments.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The review task ID' },
        workspacePath: { type: 'string', description: 'Path to the workspace' },
        comments: {
          type: 'array',
          description: 'Array of comments to add',
          items: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Relative path to the file',
              },
              line: { type: 'number', description: 'Line number (1-based)' },
              severity: {
                type: 'string',
                enum: ['INFO', 'WARNING', 'CRITICAL'],
                description: 'Severity level',
              },
              category: {
                type: 'string',
                description: 'Category of the issue',
              },
              comment: { type: 'string', description: 'The review comment' },
              suggestion: {
                type: 'string',
                description: 'Optional code suggestion',
              },
            },
            required: ['filePath', 'line', 'severity', 'category', 'comment'],
          },
        },
      },
      required: ['taskId', 'workspacePath', 'comments'],
    },
  },
];

// ============================================================================
// Base Task Handler
// ============================================================================

/**
 * Base class for handlers that require a task
 * Provides common functionality for getting and validating tasks
 */
abstract class BaseTaskHandler {
  /**
   * Initialize database and get task, validate it exists
   */
  protected async getTaskAndValidate(taskId: string, workspacePath: string): Promise<ReviewTask> {
    const initialized = await taskReader.initialize(workspacePath);
    if (!initialized) {
      throw new McpError(
        McpErrorCodes.INTERNAL_ERROR,
        'Failed to access database. Make sure you have created tasks in the workspace.'
      );
    }

    const task = await taskReader.getTask(taskId);
    if (!task) {
      taskReader.close();
      throw new McpError(McpErrorCodes.INVALID_PARAMS, `Task not found: ${taskId}`);
    }

    return task;
  }

  /**
   * Validate task status (can be overridden by subclasses)
   */
  protected validateTaskStatus(_task: ReviewTask): void {
    // Base implementation - can be overridden by subclasses
    // For example, check if task.status is 'active' or 'pending'
  }

  /**
   * Main handle method - template method pattern
   */
  async handle(
    args: unknown,
    taskId: string,
    workspacePath: string
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const task = await this.getTaskAndValidate(taskId, workspacePath);
    this.validateTaskStatus(task);

    try {
      return await this.handleWithTask(args, task);
    } finally {
      taskReader.close();
    }
  }

  /**
   * Abstract method to be implemented by subclasses
   * @param args Original arguments from the tool call
   * @param task Validated task object
   */
  protected abstract handleWithTask(
    args: unknown,
    task: ReviewTask
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }>;
}

// ============================================================================
// Concrete Handler Implementations
// ============================================================================

/**
 * Handler for code review tool
 */
class CodeReviewHandler extends BaseTaskHandler {
  constructor(private readonly server: MCPCodeReviewServer) {
    super();
  }

  protected async handleWithTask(
    args: unknown,
    task: ReviewTask
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const input: CodeReviewInput = CodeReviewInputSchema.parse(args);
    const { step } = input;

    const workflowId = task.workflowId || 'default';
    const workflow = await taskReader.getWorkflow(workflowId);
    if (!workflow) {
      throw new McpError(McpErrorCodes.INVALID_PARAMS, `Workflow not found: ${workflowId}`);
    }

    const workflowNodes = workflow.nodes.map((node) => ({
      name: node.name,
      content: node.content,
    }));

    if (step < 0 || step >= workflowNodes.length) {
      throw new McpError(
        McpErrorCodes.INVALID_PARAMS,
        `Invalid step ${step}. Workflow has ${workflowNodes.length} step(s) (0-${workflowNodes.length - 1}).`
      );
    }

    const currentNode = workflowNodes[step];
    if (!currentNode) {
      throw new McpError(McpErrorCodes.INTERNAL_ERROR, `Workflow node at step ${step} not found`);
    }
    const isLastStep = step === workflowNodes.length - 1;

    const prompt = this.server.buildCodeReviewPrompt(
      task,
      {
        name: workflow.name,
        nodes: workflowNodes,
      },
      currentNode,
      step,
      isLastStep
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: prompt,
        },
      ],
    };
  }
}

/**
 * Handler for adding a single review comment
 */
class AddCommentHandler extends BaseTaskHandler {
  protected async handleWithTask(
    args: unknown,
    _task: ReviewTask
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const input: AddCommentInput = AddCommentInputSchema.parse(args);
    const { taskId, filePath, line, severity, category, comment, suggestion } = input;

    const commentId = computeReviewCommentId({
      taskId,
      filePath,
      line,
      severity,
      category,
      comment,
      suggestion: suggestion ?? null,
    });

    const reviewComment: ReviewComment = {
      id: commentId,
      taskId,
      filePath,
      line,
      severity,
      category,
      comment,
      suggestion,
      createdAt: Date.now(),
    };

    const saved = await taskReader.saveComment(reviewComment);

    if (!saved) {
      throw new McpError(McpErrorCodes.INTERNAL_ERROR, 'Failed to save comment.');
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Comment added to ${filePath}:${line}`,
            commentId,
            hint: 'Use "MCP Code Review: Render Comments" command in VS Code to display comments.',
          }),
        },
      ],
    };
  }
}

/**
 * Handler for adding multiple review comments
 */
class AddCommentsHandler extends BaseTaskHandler {
  protected async handleWithTask(
    args: unknown,
    _task: ReviewTask
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const input: AddCommentsInput = AddCommentsInputSchema.parse(args);
    const { taskId, comments } = input;

    const commentsWithIds: ReviewComment[] = comments.map((c) => {
      const id = computeReviewCommentId({
        taskId,
        filePath: c.filePath,
        line: c.line,
        severity: c.severity,
        category: c.category,
        comment: c.comment,
        suggestion: c.suggestion ?? null,
      });

      return {
        id,
        taskId,
        filePath: c.filePath,
        line: c.line,
        severity: c.severity,
        category: c.category,
        comment: c.comment,
        suggestion: c.suggestion,
        createdAt: Date.now(),
      };
    });

    const savedCount = await taskReader.saveComments(commentsWithIds);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: `Added ${savedCount} of ${comments.length} comments.`,
            savedCount,
            totalCount: comments.length,
            hint: 'Use "MCP Code Review: Render Comments" command in VS Code to display comments.',
          }),
        },
      ],
    };
  }
}

// ============================================================================
// MCP Server
// ============================================================================

class MCPCodeReviewServer {
  private readonly server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-codereview/server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupRequestHandlers();
  }

  private setupRequestHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [...TOOL_DEFINITIONS],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        return await this.handleToolCall(name, args);
      } catch (error) {
        const mcpError = errorHandler.handle(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(mcpError.toJSON()),
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async handleToolCall(
    toolName: string,
    args: unknown
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    switch (toolName) {
      case 'codereview':
        return await this.handleCodeReview(args);
      case 'add_review_comment':
        return await this.handleAddComment(args);
      case 'add_review_comments':
        return await this.handleAddComments(args);
      default:
        throw new McpError(McpErrorCodes.METHOD_NOT_FOUND, `Unknown tool: ${toolName}`);
    }
  }

  private async handleCodeReview(
    args: unknown
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const input: CodeReviewInput = CodeReviewInputSchema.parse(args);
    const { taskId, workspacePath } = input;

    const handler = new CodeReviewHandler(this);
    return await handler.handle(args, taskId, workspacePath);
  }

  private async handleAddComment(
    args: unknown
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const input: AddCommentInput = AddCommentInputSchema.parse(args);
    const { taskId, workspacePath } = input;

    const handler = new AddCommentHandler();
    return await handler.handle(args, taskId, workspacePath);
  }

  private async handleAddComments(
    args: unknown
  ): Promise<{ content: Array<{ type: 'text'; text: string }> }> {
    const input: AddCommentsInput = AddCommentsInputSchema.parse(args);
    const { taskId, workspacePath } = input;

    const handler = new AddCommentsHandler();
    return await handler.handle(args, taskId, workspacePath);
  }

  buildCodeReviewPrompt(
    task: {
      id: string;
      name: string;
      baseBranch: string;
      baseCommit: string;
      headBranch: string;
      headCommit: string;
    },
    workflow: {
      name: string;
      nodes: Array<{
        name: string;
        content: string;
      }>;
    },
    currentNode: { name: string; content: string },
    step: number,
    isLastStep: boolean
  ): string {
    const totalSteps = workflow.nodes.length;
    const stepsOverview = workflow.nodes
      .map(
        (node, idx) =>
          `  ${idx === step ? '→' : ' '} Step ${idx + 1}: ${node.name}${idx === step ? ' (current)' : ''}`
      )
      .join('\n');

    const nodeContent = currentNode.content
      .replace(/\{\{base_branch\}\}/g, task.baseBranch)
      .replace(/\{\{base_commit\}\}/g, task.baseCommit)
      .replace(/\{\{head_branch\}\}/g, task.headBranch)
      .replace(/\{\{head_commit\}\}/g, task.headCommit)
      .replace(/\{\{task_id\}\}/g, task.id);

    return `# Code Review Task: ${task.name}

## Task Information
- **Task ID**: ${task.id}
- **Base Branch**: ${task.baseBranch} (commit: ${task.baseCommit.substring(0, 7)})
- **Head Branch**: ${task.headBranch} (commit: ${task.headCommit.substring(0, 7)})
- **Workflow**: ${workflow.name}

## How to Get Code Changes
Run the following command to get the diff:
\`\`\`bash
git diff ${task.baseCommit} ${task.headCommit}
\`\`\`

## Review Progress
**Current Step**: ${step + 1} / ${totalSteps}

${stepsOverview}

---

## Current Step: ${currentNode.name}

${nodeContent}

---

## Adding Review Comments

Use the following tools to add review comments:

### Single Comment
\`\`\`
add_review_comment(
  taskId: "${task.id}",
  workspacePath: "<workspace_path>",
  filePath: "src/main/java/com/example/service/UserService.java",
  line: 10,
  severity: "WARNING",  // INFO, WARNING, or CRITICAL
  category: "Security",
  comment: "Your review comment here",
  suggestion: "Optional code suggestion"
)
\`\`\`

### Multiple Comments
\`\`\`
add_review_comments(
  taskId: "${task.id}",
  workspacePath: "<workspace_path>",
  comments: [
    { filePath: "...", line: 10, severity: "WARNING", category: "...", comment: "..." },
    { filePath: "...", line: 20, severity: "CRITICAL", category: "...", comment: "...", suggestion: "..." }
  ]
)
\`\`\`

---

## Instructions

1. **First**, collect the code changes using the git diff command above
2. **Analyze** the changes according to the prompt above
3. **Add review comments** using the add_review_comment or add_review_comments tools
4. ${
      isLastStep
        ? '**This is the final step.** Summarize your findings after completing the review.'
        : `**Next Step**: After completing this step, call the codereview tool with:\n   - taskId: "${task.id}"\n   - step: ${step + 1}\n   - workspacePath: (same as before)`
    }

**Important**: You must complete each step before moving to the next one. Each step focuses on different aspects of the code review.
`;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    process.stderr.write('MCP CodeReview Server is running on stdio\n');
  }
}

// ============================================================================
// Entry Point
// ============================================================================

const server = new MCPCodeReviewServer();
server.run().catch((error) => {
  const mcpError = errorHandler.handle(error);
  process.stderr.write(`Server startup failed: ${mcpError.message}\n`);
  process.exit(1);
});
