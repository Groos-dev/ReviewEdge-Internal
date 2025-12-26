/**
 * Webview Message Types
 *
 * Type definitions for communication between extension and webviews.
 */

import type { Workflow } from '../../../ui/src/types/config';

// ============================================================================
// Workflow Editor Messages
// ============================================================================

export interface WorkflowEditorReadyMessage {
  command: 'ready';
}

export interface WorkflowEditorSaveMessage {
  command: 'save';
  data: Workflow;
}

export interface WorkflowEditorDuplicateMessage {
  command: 'duplicate';
  data: Workflow;
}

export interface WorkflowEditorSetDirtyMessage {
  command: 'setDirty';
  dirty: boolean;
}

export type WorkflowEditorIncomingMessage =
  | WorkflowEditorReadyMessage
  | WorkflowEditorSaveMessage
  | WorkflowEditorDuplicateMessage
  | WorkflowEditorSetDirtyMessage;

export interface WorkflowEditorInitializeMessage {
  command: 'initialize';
  data: {
    workflow: Workflow;
    isReadonly: boolean;
  };
}

export interface WorkflowEditorSavedMessage {
  command: 'saved';
}

export type WorkflowEditorOutgoingMessage =
  | WorkflowEditorInitializeMessage
  | WorkflowEditorSavedMessage;

// ============================================================================
// Sidebar Messages
// ============================================================================

export interface SidebarRefreshMessage {
  command: 'refresh';
  data: {
    workflows: readonly Workflow[];
    tasks: readonly import('../../../ui/src/types/config').ReviewTask[];
  };
}

// ============================================================================
// Diff Viewer Messages
// ============================================================================

export interface GotoLineMessage {
  command: 'gotoLine';
  filePath: string;
  line: number;
  side: 'old' | 'new';
}

// ============================================================================
// Workflow Node for Creation
// ============================================================================

export interface WorkflowNodeInput {
  name: string;
  content: string;
  order: number;
}
