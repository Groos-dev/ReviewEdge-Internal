/**
 * Workflow Editor Component
 *
 * Main entry point for the workflow editor webview.
 * Uses Monaco Editor for prompt editing with variable auto-completion.
 */

import Editor, { loader, useMonaco } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/variables.css';
import '../../styles/base.css';
import '../../styles/common.css';
import '../../styles/workflow.css';
import type { PromptNode, Workflow } from '../../types/config';
import {
  EDITOR_THEMES,
  type EditorTheme,
  MONACO_EDITOR_OPTIONS,
  PROMPT_VARIABLES,
  THEME_CLASSES,
  VARIABLE_PATTERN,
  WEBVIEW_COMMANDS,
} from './constants';
import type { IncomingMessage, OutgoingMessage, VsCodeApi, WorkflowState } from './types';

// ============================================================================
// Monaco Configuration
// ============================================================================

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

loader.config({ monaco });

// ============================================================================
// VS Code API
// ============================================================================

declare const acquireVsCodeApi: () => VsCodeApi;

// Cache the API instance to prevent multiple calls (which throws an error)
const vscode: VsCodeApi = (() => {
  const win = window as Window & { vscodeApi?: VsCodeApi };
  if (win.vscodeApi) {
    return win.vscodeApi;
  }
  const api = acquireVsCodeApi();
  win.vscodeApi = api;
  return api;
})();

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to detect and track VS Code theme changes
 */
function useThemeDetection(): EditorTheme {
  const [editorTheme, setEditorTheme] = useState<EditorTheme>(EDITOR_THEMES.DARK);

  useEffect(() => {
    const detectTheme = () => {
      const isDark =
        document.body.classList.contains(THEME_CLASSES.DARK) ||
        document.body.classList.contains(THEME_CLASSES.HIGH_CONTRAST);
      setEditorTheme(isDark ? EDITOR_THEMES.DARK : EDITOR_THEMES.LIGHT);
    };

    detectTheme();

    const observer = new MutationObserver(detectTheme);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    return () => observer.disconnect();
  }, []);

  return editorTheme;
}

/**
 * Hook to configure Monaco variable completion
 */
function useVariableCompletion(monacoInstance: ReturnType<typeof useMonaco>): void {
  useEffect(() => {
    if (!monacoInstance) return;

    const disposable = monacoInstance.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters: ['{'],
      provideCompletionItems: (model, position) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const match = textUntilPosition.match(VARIABLE_PATTERN);
        if (!match) {
          return { suggestions: [] };
        }

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = PROMPT_VARIABLES.map((v) => ({
          label: v.label,
          kind: monacoInstance.languages.CompletionItemKind.Variable,
          insertText: `${v.label}}}`,
          detail: v.detail,
          range,
          documentation: `Insert variable: {{${v.label}}}`,
        }));

        return { suggestions };
      },
    });

    return () => disposable.dispose();
  }, [monacoInstance]);
}

/**
 * Hook to handle webview messages
 */
function useWebviewMessages(
  setState: React.Dispatch<React.SetStateAction<WorkflowState | null>>,
  setSelectedNode: React.Dispatch<React.SetStateAction<string | null>>
): void {
  useEffect(() => {
    const handleMessage = (event: MessageEvent<IncomingMessage>) => {
      const message = event.data;
      if (message.command === WEBVIEW_COMMANDS.INITIALIZE) {
        setState(message.data);
        if (message.data.workflow.nodes.length > 0) {
          setSelectedNode(message.data.workflow.nodes[0].id);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    const readyMessage: OutgoingMessage = { command: 'ready' };
    vscode.postMessage(readyMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, [setState, setSelectedNode]);
}

// ============================================================================
// Main Component
// ============================================================================

const WorkflowEditorApp: FC = () => {
  const [state, setState] = useState<WorkflowState | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const editorTheme = useThemeDetection();
  const monacoInstance = useMonaco();

  useVariableCompletion(monacoInstance);
  useWebviewMessages(setState, setSelectedNode);

  // ============================================================================
  // Handlers
  // ============================================================================

  const [isDirty, setIsDirty] = useState(false);
  const initialWorkflowRef = useRef<string | null>(null);

  // Track dirty state by comparing current workflow to initial
  useEffect(() => {
    if (state && !state.isReadonly) {
      if (initialWorkflowRef.current === null) {
        initialWorkflowRef.current = JSON.stringify(state.workflow);
      } else {
        const currentJson = JSON.stringify(state.workflow);
        const dirty = currentJson !== initialWorkflowRef.current;
        if (dirty !== isDirty) {
          setIsDirty(dirty);
          const dirtyMessage: OutgoingMessage = { command: 'setDirty', dirty };
          vscode.postMessage(dirtyMessage);
        }
      }
    }
  }, [state, isDirty]);

  const handleSave = useCallback(() => {
    if (state && !state.isReadonly) {
      const message: OutgoingMessage = { command: 'save', data: state.workflow };
      vscode.postMessage(message);
      // Reset dirty state after save
      initialWorkflowRef.current = JSON.stringify(state.workflow);
      setIsDirty(false);
    }
  }, [state]);

  // Ctrl+S / Cmd+S keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  const handleDuplicate = useCallback(() => {
    if (state) {
      const message: OutgoingMessage = { command: 'duplicate', data: state.workflow };
      vscode.postMessage(message);
    }
  }, [state]);

  const handleAddNode = useCallback(() => {
    if (!state) return;

    const now = Date.now();
    const newNode: PromptNode = {
      id: `node-${now}`,
      name: `Step ${state.workflow.nodes.length + 1}`,
      content: '',
      order: state.workflow.nodes.length,
      createdAt: now,
      updatedAt: now,
    };

    setState({
      ...state,
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, newNode],
        updatedAt: now,
      },
    });
    setSelectedNode(newNode.id);
  }, [state]);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      if (!state) return;

      const updatedNodes = state.workflow.nodes
        .filter((n) => n.id !== nodeId)
        .map((n, idx) => ({ ...n, order: idx }));

      setState({
        ...state,
        workflow: {
          ...state.workflow,
          nodes: updatedNodes,
          updatedAt: Date.now(),
        },
      });

      if (selectedNode === nodeId) {
        setSelectedNode(updatedNodes.length > 0 ? (updatedNodes[0]?.id ?? null) : null);
      }
    },
    [state, selectedNode]
  );

  const handleMoveNode = useCallback(
    (nodeId: string, direction: 'up' | 'down') => {
      if (!state) return;

      const currentIndex = state.workflow.nodes.findIndex((n) => n.id === nodeId);
      if (currentIndex < 0) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= state.workflow.nodes.length) return;

      const updatedNodes = [...state.workflow.nodes];
      const [removed] = updatedNodes.splice(currentIndex, 1);
      if (!removed) return;
      updatedNodes.splice(newIndex, 0, removed);

      const reorderedNodes = updatedNodes.map((n, idx) => ({ ...n, order: idx }));

      setState({
        ...state,
        workflow: {
          ...state.workflow,
          nodes: reorderedNodes,
          updatedAt: Date.now(),
        },
      });
    },
    [state]
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<PromptNode>) => {
      if (!state) return;

      const updatedNodes = state.workflow.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates, updatedAt: Date.now() } : n
      );

      setState({
        ...state,
        workflow: {
          ...state.workflow,
          nodes: updatedNodes,
          updatedAt: Date.now(),
        },
      });
    },
    [state]
  );

  const handleUpdateWorkflow = useCallback(
    (updates: Partial<Workflow>) => {
      if (!state) return;

      setState({
        ...state,
        workflow: {
          ...state.workflow,
          ...updates,
          updatedAt: Date.now(),
        },
      });
    },
    [state]
  );

  // ============================================================================
  // Derived State
  // ============================================================================

  const selectedNodeData = useMemo(
    () => state?.workflow.nodes.find((n) => n.id === selectedNode),
    [state, selectedNode]
  );

  // ============================================================================
  // Render
  // ============================================================================

  if (!state) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="workflow-editor-container">
      <WorkflowHeader
        workflow={state.workflow}
        isReadonly={state.isReadonly}
        onDuplicate={handleDuplicate}
        onUpdateWorkflow={handleUpdateWorkflow}
      />

      <div className="main-content">
        <NodesList
          nodes={state.workflow.nodes}
          selectedNode={selectedNode}
          isReadonly={state.isReadonly}
          onSelectNode={setSelectedNode}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onMoveNode={handleMoveNode}
        />

        {selectedNodeData && (
          <NodeEditor
            node={selectedNodeData}
            isReadonly={state.isReadonly}
            editorTheme={editorTheme}
            onUpdateNode={(updates) => handleUpdateNode(selectedNodeData.id, updates)}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Sub-Components
// ============================================================================

interface WorkflowHeaderProps {
  workflow: Workflow;
  isReadonly: boolean;
  onDuplicate: () => void;
  onUpdateWorkflow: (updates: Partial<Workflow>) => void;
}

const WorkflowHeader: FC<WorkflowHeaderProps> = ({
  workflow,
  isReadonly,
  onDuplicate,
  onUpdateWorkflow,
}) => (
  <div className="workflow-header">
    <div className="workflow-info">
      {isReadonly && (
        <span className="readonly-lock" title="Read-only system workflow">
          <i className="codicon codicon-lock" />
        </span>
      )}
      {isReadonly ? (
        <h2>{workflow.name}</h2>
      ) : (
        <input
          type="text"
          className="workflow-name-input"
          value={workflow.name}
          onChange={(e) => onUpdateWorkflow({ name: e.target.value })}
          placeholder="Workflow Name"
        />
      )}
    </div>
    <div className="header-actions">
      {isReadonly && (
        <button
          type="button"
          className="header-action-btn"
          onClick={onDuplicate}
          title="Duplicate to Edit"
        >
          <i className="codicon codicon-copy" />
        </button>
      )}
    </div>
  </div>
);

interface NodesListProps {
  nodes: readonly PromptNode[];
  selectedNode: string | null;
  isReadonly: boolean;
  onSelectNode: (id: string) => void;
  onAddNode: () => void;
  onDeleteNode: (id: string) => void;
  onMoveNode: (id: string, direction: 'up' | 'down') => void;
}

const NodesList: FC<NodesListProps> = ({
  nodes,
  selectedNode,
  isReadonly,
  onSelectNode,
  onAddNode,
  onDeleteNode,
  onMoveNode,
}) => (
  <div className="nodes-list">
    <div className="nodes-list-header">
      <h3>Steps ({nodes.length})</h3>
      {!isReadonly && (
        <button type="button" className="btn-icon" onClick={onAddNode} title="Add Step">
          ➕
        </button>
      )}
    </div>
    <div className="nodes-list-content">
      {nodes.map((node, index) => (
        <button
          type="button"
          key={node.id}
          className={`node-item ${selectedNode === node.id ? 'selected' : ''}`}
          onClick={() => onSelectNode(node.id)}
        >
          <div className="node-info">
            <span className="node-order">{index + 1}</span>
            <span className="node-name">{node.name}</span>
          </div>
          {!isReadonly && (
            <div className="node-actions">
              <button
                type="button"
                className="btn-icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveNode(node.id, 'up');
                }}
                disabled={index === 0}
                title="Move Up"
              >
                ↑
              </button>
              <button
                type="button"
                className="btn-icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveNode(node.id, 'down');
                }}
                disabled={index === nodes.length - 1}
                title="Move Down"
              >
                ↓
              </button>
              <button
                type="button"
                className="btn-icon-sm danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.id);
                }}
                title="Delete"
              >
                ✖
              </button>
            </div>
          )}
        </button>
      ))}
    </div>
  </div>
);

interface NodeEditorProps {
  node: PromptNode;
  isReadonly: boolean;
  editorTheme: EditorTheme;
  onUpdateNode: (updates: Partial<PromptNode>) => void;
}

const PLACEHOLDER_TEXT = `Enter your prompt here...

Type {{ to insert variables like:
  {{diff_content}} - Full diff content
  {{file_path}} - Current file path
  {{language}} - Programming language`;

const NodeEditor: FC<NodeEditorProps> = ({ node, isReadonly, editorTheme, onUpdateNode }) => {
  const showPlaceholder = !node.content;

  return (
    <div className="node-editor">
      <div className="node-editor-header">
        {isReadonly ? (
          <h3>{node.name}</h3>
        ) : (
          <input
            type="text"
            className="node-name-input"
            value={node.name}
            onChange={(e) => onUpdateNode({ name: e.target.value })}
            placeholder="Step Name"
          />
        )}
      </div>
      <div className="node-editor-content">
        {showPlaceholder && !isReadonly && (
          <div className="editor-placeholder">{PLACEHOLDER_TEXT}</div>
        )}
        <Editor
          height="100%"
          language="markdown"
          theme={editorTheme}
          value={node.content}
          onChange={(value) => {
            if (value !== undefined) {
              onUpdateNode({ content: value });
            }
          }}
          options={{
            readOnly: isReadonly,
            ...MONACO_EDITOR_OPTIONS,
          }}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Mount
// ============================================================================

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<WorkflowEditorApp />);
}
