/**
 * Workflow Editor Types
 */

import type { Workflow } from '../../types/config';

// ============================================================================
// State Types
// ============================================================================

export interface WorkflowState {
  workflow: Workflow;
  isReadonly: boolean;
}

// ============================================================================
// Message Types (Outgoing to Extension)
// ============================================================================

export interface ReadyMessage {
  command: 'ready';
}

export interface SaveMessage {
  command: 'save';
  data: Workflow;
}

export interface DuplicateMessage {
  command: 'duplicate';
  data: Workflow;
}

export interface SetDirtyMessage {
  command: 'setDirty';
  dirty: boolean;
}

export type OutgoingMessage = ReadyMessage | SaveMessage | DuplicateMessage | SetDirtyMessage;

// ============================================================================
// Message Types (Incoming from Extension)
// ============================================================================

export interface InitializeMessage {
  command: 'initialize';
  data: WorkflowState;
}

export interface SavedMessage {
  command: 'saved';
}

export type IncomingMessage = InitializeMessage | SavedMessage;

// ============================================================================
// VS Code API Type
// ============================================================================

export interface VsCodeApi {
  postMessage: (message: OutgoingMessage) => void;
  getState: () => WorkflowState | undefined;
  setState: (state: WorkflowState) => void;
}
