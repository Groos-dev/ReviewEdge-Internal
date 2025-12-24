import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { get, isEmpty } from 'lodash';
import initSqlJs, { type Database } from 'sql.js';
import type { PromptNode, ReviewComment, ReviewTask, Workflow } from '../types/review.js';
import schemaSql from './schema.sql';

const CODEVIEW_FOLDER = '.codeview';
const DB_FILE = 'mcp-codereview.db';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Converts a database row to an object using column names
 */
function rowToObject(columns: readonly string[], row: readonly unknown[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  columns.forEach((col, idx) => {
    obj[col] = row[idx];
  });
  return obj;
}

/**
 * Safely extracts the first result from a database query
 */
function getFirstResult(
  result: ReturnType<Database['exec']> | undefined
): { columns: readonly string[]; values: readonly (readonly unknown[])[] } | null {
  if (isEmpty(result)) return null;
  const firstResult = get(result, '[0]');
  if (!firstResult) return null;
  const columns = get(firstResult, 'columns', []) as readonly string[];
  const values = get(firstResult, 'values', []) as readonly (readonly unknown[])[];
  if (isEmpty(values)) return null;
  return { columns, values };
}

/**
 * Safely extracts a single row from the first result
 */
function getFirstRow(
  result: ReturnType<Database['exec']> | undefined
): Record<string, unknown> | null {
  const firstResult = getFirstResult(result);
  if (!firstResult || firstResult.values.length === 0) return null;
  const firstRow = firstResult.values[0];
  if (!firstRow) return null;
  return rowToObject(firstResult.columns, firstRow);
}

function resolveDbPath(workspacePath: string): string {
  const preferredRoot = workspacePath?.trim() ? workspacePath : os.homedir();
  const preferredDir = path.join(preferredRoot, CODEVIEW_FOLDER);

  try {
    fs.mkdirSync(preferredDir, { recursive: true });
    return path.join(preferredDir, DB_FILE);
  } catch {
    const fallbackDir = path.join(os.homedir(), CODEVIEW_FOLDER);
    fs.mkdirSync(fallbackDir, { recursive: true });
    return path.join(fallbackDir, DB_FILE);
  }
}

export class TaskReader {
  private db: Database | null = null;
  private SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;
  private dbPath = '';

  async initialize(workspacePath: string): Promise<boolean> {
    if (!this.SQL) {
      this.SQL = await initSqlJs({
        locateFile: (file: string) => {
          // TODO need refactor
          // Try multiple locations for the wasm file
          const locations = [
            // 1. Same directory as this script
            path.join(__dirname, file),
            // 2. Parent directory (for bundled extension)
            path.join(__dirname, '..', file),
            // 3. Dist root (for extension)
            path.join(__dirname, '..', '..', file),
          ];

          for (const location of locations) {
            if (fs.existsSync(location)) {
              return location;
            }
          }

          // Fallback to default
          console.warn(
            `[TaskReader] WASM file not found in expected locations, using default: ${file}`
          );
          return file;
        },
      });
    }

    this.dbPath = resolveDbPath(workspacePath);

    if (!fs.existsSync(this.dbPath)) {
      console.error(`[TaskReader] Database not found, creating: ${this.dbPath}`);
      this.db = new this.SQL.Database();
      this.db.run(schemaSql);
      this.ensureDefaultWorkflow();
      this.save();
      return true;
    }

    try {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new this.SQL.Database(buffer);
      console.error(`[TaskReader] Database loaded from: ${this.dbPath}`);
      this.db.run(schemaSql);
      this.ensureDefaultWorkflow();
      this.save();
      return true;
    } catch (error) {
      console.error('[TaskReader] Failed to load database:', error);
      return false;
    }
  }

  private ensureDefaultWorkflow(): void {
    if (!this.db) return;

    const now = Date.now();
    this.db.run(
      `INSERT OR IGNORE INTO workflows (id, name, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      ['default', 'Default Workflow', 'Default workflow', now, now]
    );

    this.db.run(
      `INSERT OR IGNORE INTO prompt_nodes (id, workflowId, name, content, "order", createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        'default-node-1',
        'default',
        'General Review',
        'Review the diff between {{base_commit}} and {{head_commit}} on branch {{head_branch}}. Add actionable comments with severity and category.',
        0,
        now,
        now,
      ]
    );
  }

  async getTasks(): Promise<ReviewTask[]> {
    if (!this.db) return [];

    try {
      const result = this.db.exec('SELECT * FROM tasks ORDER BY createdAt DESC');
      const firstResult = getFirstResult(result);
      if (!firstResult) return [];

      return firstResult.values.map((row) => {
        const obj = rowToObject(firstResult.columns, row);
        return {
          id: obj.id as string,
          name: obj.name as string,
          baseBranch: obj.baseBranch as string,
          baseCommit: obj.baseCommit as string,
          headBranch: obj.headBranch as string,
          headCommit: obj.headCommit as string,
          workflowId: (obj.workflowId as string | null) || null,
          createdAt: obj.createdAt as number,
          updatedAt: (obj.updatedAt as number | null) || (obj.createdAt as number),
        };
      });
    } catch (error) {
      console.error('[TaskReader] Failed to list tasks:', error);
      return [];
    }
  }

  async getTask(taskId: string): Promise<ReviewTask | null> {
    if (!this.db) return null;

    try {
      const result = this.db.exec('SELECT * FROM tasks WHERE id = ?', [taskId]);
      const obj = getFirstRow(result);
      if (!obj) return null;

      return {
        id: obj.id as string,
        name: obj.name as string,
        baseBranch: obj.baseBranch as string,
        baseCommit: obj.baseCommit as string,
        headBranch: obj.headBranch as string,
        headCommit: obj.headCommit as string,
        workflowId: (obj.workflowId as string | null) || null,
        createdAt: obj.createdAt as number,
        updatedAt: (obj.updatedAt as number | null) || (obj.createdAt as number),
      };
    } catch (error) {
      console.error('[TaskReader] Failed to get task:', error);
      return null;
    }
  }

  async createTask(task: Omit<ReviewTask, 'createdAt' | 'updatedAt'>): Promise<ReviewTask> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      const now = Date.now();
      const newTask: ReviewTask = {
        ...task,
        createdAt: now,
        updatedAt: now,
      };

      this.db.run(
        `INSERT INTO tasks (id, name, baseBranch, baseCommit, headBranch, headCommit, workflowId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newTask.id,
          newTask.name,
          newTask.baseBranch,
          newTask.baseCommit,
          newTask.headBranch,
          newTask.headCommit,
          newTask.workflowId,
          newTask.createdAt,
          newTask.updatedAt,
        ]
      );
      this.save();
      return newTask;
    } catch (error) {
      console.error('[TaskReader] Failed to create task:', error);
      throw error;
    }
  }

  async updateTask(
    taskId: string,
    updates: Partial<
      Pick<ReviewTask, 'name' | 'baseBranch' | 'baseCommit' | 'headBranch' | 'headCommit'>
    >
  ): Promise<ReviewTask | null> {
    if (!this.db) return null;

    try {
      const currentTask = await this.getTask(taskId);
      if (!currentTask) {
        console.error('[TaskReader] Task not found:', taskId);
        return null;
      }

      const updatedTask: ReviewTask = {
        ...currentTask,
        ...updates,
        updatedAt: Date.now(),
      };

      this.db.run(
        `UPDATE tasks
         SET name = ?, baseBranch = ?, baseCommit = ?, headBranch = ?, headCommit = ?, workflowId = ?, updatedAt = ?
         WHERE id = ?`,
        [
          updatedTask.name,
          updatedTask.baseBranch,
          updatedTask.baseCommit,
          updatedTask.headBranch,
          updatedTask.headCommit,
          updatedTask.workflowId,
          updatedTask.updatedAt,
          taskId,
        ]
      );
      this.save();
      return updatedTask;
    } catch (error) {
      console.error('[TaskReader] Failed to update task:', error);
      return null;
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      this.db.run('DELETE FROM tasks WHERE id = ?', [taskId]);
      this.db.run('DELETE FROM review_comments WHERE taskId = ?', [taskId]);
      this.save();
      return true;
    } catch (error) {
      console.error('[TaskReader] Failed to delete task:', error);
      return false;
    }
  }

  async getWorkflows(): Promise<Workflow[]> {
    if (!this.db) return [];

    try {
      const result = this.db.exec('SELECT * FROM workflows ORDER BY updatedAt DESC');
      const firstResult = getFirstResult(result);
      if (!firstResult) return [];

      const workflows: Workflow[] = [];
      for (const row of firstResult.values) {
        const obj = rowToObject(firstResult.columns, row);
        const nodes = await this.getWorkflowNodes(obj.id as string);

        workflows.push({
          id: obj.id as string,
          name: obj.name as string,
          description: (obj.description as string | null) || '',
          nodes,
          createdAt: obj.createdAt as number,
          updatedAt: obj.updatedAt as number,
        });
      }

      return workflows;
    } catch (error) {
      console.error('[TaskReader] Failed to list workflows:', error);
      return [];
    }
  }

  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    if (!this.db) return null;

    try {
      const result = this.db.exec('SELECT * FROM workflows WHERE id = ?', [workflowId]);
      const obj = getFirstRow(result);
      if (!obj) return null;

      const nodes = await this.getWorkflowNodes(workflowId);

      return {
        id: obj.id as string,
        name: obj.name as string,
        description: (obj.description as string | null) || '',
        nodes,
        createdAt: obj.createdAt as number,
        updatedAt: obj.updatedAt as number,
      };
    } catch (error) {
      console.error('[TaskReader] Failed to get workflow:', error);
      return null;
    }
  }

  private async getWorkflowNodes(workflowId: string): Promise<PromptNode[]> {
    if (!this.db) return [];

    try {
      const result = this.db.exec(
        'SELECT * FROM prompt_nodes WHERE workflowId = ? ORDER BY "order" ASC',
        [workflowId]
      );
      const firstResult = getFirstResult(result);
      if (!firstResult) return [];

      return firstResult.values.map((row) => {
        const obj = rowToObject(firstResult.columns, row);
        return {
          id: obj.id as string,
          name: obj.name as string,
          content: obj.content as string,
          order: obj.order as number,
          createdAt: obj.createdAt as number,
          updatedAt: obj.updatedAt as number,
        };
      });
    } catch (error) {
      console.error('[TaskReader] Failed to get workflow nodes:', error);
      return [];
    }
  }

  async getCommentsByTask(taskId: string): Promise<ReviewComment[]> {
    if (!this.db) return [];

    try {
      const result = this.db.exec(
        'SELECT * FROM review_comments WHERE taskId = ? ORDER BY filePath, line',
        [taskId]
      );
      const firstResult = getFirstResult(result);
      if (!firstResult) return [];

      return firstResult.values.map((row) => {
        const obj = rowToObject(firstResult.columns, row);
        return {
          id: obj.id as string,
          taskId: obj.taskId as string,
          filePath: obj.filePath as string,
          line: obj.line as number,
          severity: obj.severity as string,
          category: obj.category as string,
          comment: obj.comment as string,
          suggestion: (obj.suggestion as string | null) || undefined,
          resolved: obj.resolved === 1,
          resolvedAt: (obj.resolvedAt as number | null) || undefined,
          resolvedBy: (obj.resolvedBy as string | null) || undefined,
          createdAt: obj.createdAt as number,
        };
      });
    } catch (error) {
      console.error('[TaskReader] Failed to load comments:', error);
      return [];
    }
  }

  async saveComment(comment: ReviewComment): Promise<boolean> {
    if (!this.db) return false;

    try {
      this.db.run(
        `INSERT OR REPLACE INTO review_comments (id, taskId, filePath, line, severity, category, comment, suggestion, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          comment.id,
          comment.taskId,
          comment.filePath,
          comment.line,
          comment.severity,
          comment.category,
          comment.comment,
          comment.suggestion || null,
          comment.createdAt,
        ]
      );
      this.save();
      return true;
    } catch (error) {
      console.error('[TaskReader] Failed to save comment:', error);
      return false;
    }
  }

  async saveComments(comments: readonly ReviewComment[]): Promise<number> {
    if (!this.db) return 0;

    let saved = 0;
    try {
      for (const comment of comments) {
        this.db.run(
          `INSERT OR REPLACE INTO review_comments (id, taskId, filePath, line, severity, category, comment, suggestion, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            comment.id,
            comment.taskId,
            comment.filePath,
            comment.line,
            comment.severity,
            comment.category,
            comment.comment,
            comment.suggestion || null,
            comment.createdAt,
          ]
        );
        saved++;
      }
      this.save();
      return saved;
    } catch (error) {
      console.error('[TaskReader] Failed to save comments:', error);
      return saved;
    }
  }

  private save(): void {
    if (!this.db || !this.dbPath) return;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const taskReader = new TaskReader();
