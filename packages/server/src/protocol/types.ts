/**
 * Protocol types for IPC communication between Extension/IDEA plugin and Server
 */

export interface Message<T = unknown> {
  messageType: string;
  messageId: string;
  data: T;
}

export interface Response<T = unknown> {
  done: boolean;
  content?: T;
  error?: string;
  status: 'success' | 'error';
}

// ============================================================================
// To Server Protocol (Extension/IDEA Plugin -> Server)
// ============================================================================

export interface ToServerProtocol {
  // Workflow operations
  'workflow/list': { workspacePath: string };
  'workflow/get': { workflowId: string; workspacePath: string };
  'workflow/create': {
    workflow: {
      name: string;
      description?: string;
      nodes?: Array<{
        id?: string;
        name: string;
        content: string;
        order: number;
      }>;
    };
    workspacePath: string;
  };
  'workflow/update': {
    workflow: {
      id: string;
      name: string;
      description: string;
      nodes: Array<{
        id?: string;
        name: string;
        content: string;
        order: number;
        createdAt?: number;
        updatedAt?: number;
      }>;
      createdAt: number;
      updatedAt: number;
    };
    workspacePath: string;
  };
  'workflow/delete': { workflowId: string; workspacePath: string };
  'workflow/isBuiltin': { workflowId: string; workspacePath: string };

  // Task operations
  'task/list': { workspacePath: string };
  'task/get': { taskId: string; workspacePath: string };
  'task/create': {
    task: {
      name: string;
      baseBranch: string;
      baseCommit: string;
      headBranch: string;
      headCommit: string;
      workflowId?: string | null;
    };
    workspacePath: string;
  };
  'task/update': {
    taskId: string;
    task: {
      name?: string;
      baseBranch?: string;
      baseCommit?: string;
      headBranch?: string;
      headCommit?: string;
      workflowId?: string | null;
    };
    workspacePath: string;
  };
  'task/delete': { taskId: string; workspacePath: string };

  // Comment operations
  'comment/list': { taskId: string; workspacePath: string };
  'comment/add': {
    taskId: string;
    comment: {
      filePath: string;
      line: number;
      severity: string;
      category: string;
      comment: string;
      suggestion?: string | null;
    };
    workspacePath: string;
  };
  'comment/addMultiple': {
    taskId: string;
    comments: Array<{
      filePath: string;
      line: number;
      severity: string;
      category: string;
      comment: string;
      suggestion?: string | null;
    }>;
    workspacePath: string;
  };
}

// ============================================================================
// From Server Protocol (Server -> Extension/IDEA Plugin)
// ============================================================================

export interface FromServerProtocol {
  // TODO(types): Replace `unknown` payloads with shared domain types.
  //   Current usage relies on unsafe casts in the extension (e.g. `as Workflow[]`).
  // Workflow responses
  'workflow/list': { workflows: Array<unknown> };
  'workflow/get': { workflow: unknown | null };
  'workflow/create': { workflow: unknown };
  'workflow/update': { workflow: unknown };
  'workflow/delete': { success: boolean; error?: string };
  'workflow/isBuiltin': { isBuiltin: boolean };

  // Task responses
  'task/list': { tasks: Array<unknown> };
  'task/get': { task: unknown | null };
  'task/create': { task: unknown };
  'task/update': { task: unknown };
  'task/delete': { success: boolean };

  // Comment responses
  'comment/list': { comments: Array<unknown> };
  'comment/add': { success: boolean; commentId: string };
  'comment/addMultiple': { success: boolean; savedCount: number; totalCount: number };
}
