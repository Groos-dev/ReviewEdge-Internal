/**
 * Code Review Client for VSCode Extension
 * Uses InProcessMessenger to communicate with CodeReviewCore
 */

import type { InProcessMessenger } from '../../../server/src/protocol/InProcessMessenger.js';
import type { FromServerProtocol, ToServerProtocol } from '../../../server/src/protocol/types.js';
import type { ReviewComment, ReviewTask, Workflow } from '../../../ui/src/types/config';
import type { TaskCreationParams } from '../types/git';

export class CodeReviewClient {
  constructor(private messenger: InProcessMessenger<ToServerProtocol, FromServerProtocol>) {}

  async listWorkflows(workspacePath: string): Promise<Workflow[]> {
    const response = await this.messenger.request('workflow/list', { workspacePath });
    return (response.workflows as Workflow[]) ?? [];
  }

  async getWorkflow(workflowId: string, workspacePath: string): Promise<Workflow | null> {
    const response = await this.messenger.request('workflow/get', { workflowId, workspacePath });
    return (response.workflow as Workflow) ?? null;
  }

  async listTasks(workspacePath: string): Promise<ReviewTask[]> {
    const response = await this.messenger.request('task/list', { workspacePath });
    return (response.tasks as ReviewTask[]) ?? [];
  }

  async getTask(taskId: string, workspacePath: string): Promise<ReviewTask | null> {
    const response = await this.messenger.request('task/get', { taskId, workspacePath });
    return (response.task as ReviewTask) ?? null;
  }

  async createTask(task: TaskCreationParams, workspacePath: string): Promise<ReviewTask | null> {
    const response = await this.messenger.request('task/create', { task, workspacePath });
    return (response.task as ReviewTask) ?? null;
  }

  async deleteTask(taskId: string, workspacePath: string): Promise<boolean> {
    const response = await this.messenger.request('task/delete', { taskId, workspacePath });
    return response.success ?? false;
  }

  async getCommentsByTask(taskId: string, workspacePath: string): Promise<ReviewComment[]> {
    const response = await this.messenger.request('comment/list', { taskId, workspacePath });
    return (response.comments as ReviewComment[]) ?? [];
  }
}
