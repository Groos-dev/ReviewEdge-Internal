/**
 * Core business logic for Code Review
 * This is the shared core that can be used by both MCP server and Extension
 */

import { taskReader } from '../database/TaskReader.js';
import { McpError, McpErrorCodes } from '../errors/McpErrors.js';
import type { InProcessMessenger } from '../protocol/InProcessMessenger.js';
import type { FromServerProtocol, Message, ToServerProtocol } from '../protocol/types.js';

export class CodeReviewCore {
  constructor(private messenger: InProcessMessenger<ToServerProtocol, FromServerProtocol>) {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Workflow handlers
    this.messenger.on('workflow/list', async (msg: Message<ToServerProtocol['workflow/list']>) => {
      const { workspacePath } = msg.data;
      await this.ensureInitialized(workspacePath);
      const workflows = await taskReader.getWorkflows();
      taskReader.close();
      return { workflows };
    });

    this.messenger.on('workflow/get', async (msg: Message<ToServerProtocol['workflow/get']>) => {
      const { workflowId, workspacePath } = msg.data;
      await this.ensureInitialized(workspacePath);
      const workflow = await taskReader.getWorkflow(workflowId);
      taskReader.close();
      return { workflow };
    });

    // Task handlers
    this.messenger.on('task/list', async (msg: Message<ToServerProtocol['task/list']>) => {
      const { workspacePath } = msg.data;
      await this.ensureInitialized(workspacePath);
      const tasks = await taskReader.getTasks();
      taskReader.close();
      return { tasks };
    });

    this.messenger.on('task/get', async (msg: Message<ToServerProtocol['task/get']>) => {
      const { taskId, workspacePath } = msg.data;
      await this.ensureInitialized(workspacePath);
      const task = await taskReader.getTask(taskId);
      taskReader.close();
      return { task };
    });

    this.messenger.on('task/create', async (msg: Message<ToServerProtocol['task/create']>) => {
      const { task, workspacePath } = msg.data;
      await this.ensureInitialized(workspacePath);
      const taskId = `task-${Date.now()}`;
      const newTask = await taskReader.createTask({
        id: taskId,
        name: task.name,
        baseBranch: task.baseBranch,
        baseCommit: task.baseCommit,
        headBranch: task.headBranch,
        headCommit: task.headCommit,
        workflowId: task.workflowId || null,
      });
      taskReader.close();
      return { task: newTask };
    });

    this.messenger.on('task/update', async (msg: Message<ToServerProtocol['task/update']>) => {
      const { taskId, task, workspacePath } = msg.data;
      await this.ensureInitialized(workspacePath);
      const updatedTask = await taskReader.updateTask(taskId, task);
      taskReader.close();
      return { task: updatedTask };
    });

    this.messenger.on('task/delete', async (msg: Message<ToServerProtocol['task/delete']>) => {
      const { taskId, workspacePath } = msg.data;
      await this.ensureInitialized(workspacePath);
      const success = await taskReader.deleteTask(taskId);
      taskReader.close();
      return { success };
    });

    // Comment handlers
    this.messenger.on('comment/list', async (msg: Message<ToServerProtocol['comment/list']>) => {
      const { taskId, workspacePath } = msg.data;
      await this.ensureInitialized(workspacePath);
      const comments = await taskReader.getCommentsByTask(taskId);
      taskReader.close();
      return { comments };
    });

    // Error handler
    this.messenger.onError((message, error) => {
      console.error(`[CodeReviewCore] Error handling ${message.messageType}:`, error);
    });
  }

  private async ensureInitialized(workspacePath: string): Promise<void> {
    const initialized = await taskReader.initialize(workspacePath);
    if (!initialized) {
      throw new McpError(
        McpErrorCodes.INTERNAL_ERROR,
        'Failed to access database. Make sure you have created tasks in the workspace.'
      );
    }
  }
}
