import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import baseStyles from '../../styles/base.css?raw';
import commonStyles from '../../styles/common.css?raw';
import variablesStyles from '../../styles/variables.css?raw';
import workflowStyles from '../../styles/workflow.css?raw';
import type { PromptNode, Workflow } from '../../types/config';
import { injectStyles } from '../../utils/injectStyles';

// VS Code API
declare const acquireVsCodeApi: () => {
  postMessage: (message: WebviewMessage) => void;
  getState: () => WorkflowState | undefined;
  setState: (state: WorkflowState) => void;
};

const vscode = acquireVsCodeApi();

// Types
interface WorkflowState {
  workflow: Workflow;
  isReadonly: boolean;
}

interface WebviewMessage {
  command: string;
  data?: unknown;
}

// Main Component
const WorkflowEditorApp: FC = () => {
  const [state, setState] = useState<WorkflowState | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'initialize') {
        setState(message.data);
        if (message.data.workflow.nodes.length > 0) {
          setSelectedNode(message.data.workflow.nodes[0].id);
        }
      } else if (message.command === 'saved') {
        // Show feedback
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'ready' });
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!state) {
    return <div className="loading">Loading...</div>;
  }

  const sendMessage = (command: string, data?: unknown) => {
    vscode.postMessage({ command, data });
  };

  const handleSave = () => {
    sendMessage('save', state.workflow);
  };

  const handleAddNode = () => {
    const newNode: PromptNode = {
      id: `node-${Date.now()}`,
      name: `Step ${state.workflow.nodes.length + 1}`,
      content: '',
      order: state.workflow.nodes.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setState({
      ...state,
      workflow: {
        ...state.workflow,
        nodes: [...state.workflow.nodes, newNode],
        updatedAt: Date.now(),
      },
    });
    setSelectedNode(newNode.id);
  };

  const handleDeleteNode = (nodeId: string) => {
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
  };

  const handleMoveNode = (nodeId: string, direction: 'up' | 'down') => {
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
  };

  const handleUpdateNode = (nodeId: string, updates: Partial<PromptNode>) => {
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
  };

  const handleUpdateWorkflow = (updates: Partial<Workflow>) => {
    setState({
      ...state,
      workflow: {
        ...state.workflow,
        ...updates,
        updatedAt: Date.now(),
      },
    });
  };

  const selectedNodeData = state.workflow.nodes.find((n) => n.id === selectedNode);

  return (
    <div className="workflow-editor-container">
      <div className="workflow-header">
        <div className="workflow-info">
          {state.isReadonly ? (
            <h2>{state.workflow.name}</h2>
          ) : (
            <input
              type="text"
              className="workflow-name-input"
              value={state.workflow.name}
              onChange={(e) => handleUpdateWorkflow({ name: e.target.value })}
              placeholder="Workflow Name"
            />
          )}
          {state.isReadonly && <span className="readonly-badge">🔒 Read-Only</span>}
        </div>
        {!state.isReadonly && (
          <div className="header-actions">
            <button type="button" className="btn btn-primary" onClick={handleSave}>
              Save
            </button>
          </div>
        )}
      </div>

      <div className="main-content">
        <div className="nodes-list">
          <div className="nodes-list-header">
            <h3>Steps ({state.workflow.nodes.length})</h3>
            {!state.isReadonly && (
              <button type="button" className="btn-icon" onClick={handleAddNode} title="Add Step">
                ➕
              </button>
            )}
          </div>
          <div className="nodes-list-content">
            {state.workflow.nodes.map((node, index) => (
              <button
                type="button"
                key={node.id}
                className={`node-item ${selectedNode === node.id ? 'selected' : ''}`}
                onClick={() => setSelectedNode(node.id)}
              >
                <div className="node-info">
                  <span className="node-order">{index + 1}</span>
                  <span className="node-name">{node.name}</span>
                </div>
                {!state.isReadonly && (
                  <div className="node-actions">
                    <button
                      type="button"
                      className="btn-icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveNode(node.id, 'up');
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
                        handleMoveNode(node.id, 'down');
                      }}
                      disabled={index === state.workflow.nodes.length - 1}
                      title="Move Down"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="btn-icon-sm danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteNode(node.id);
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

        {selectedNodeData && (
          <div className="node-editor">
            <div className="node-editor-header">
              {state.isReadonly ? (
                <h3>{selectedNodeData.name}</h3>
              ) : (
                <input
                  type="text"
                  className="node-name-input"
                  value={selectedNodeData.name}
                  onChange={(e) => {
                    if (selectedNode) {
                      handleUpdateNode(selectedNode, { name: e.target.value });
                    }
                  }}
                  placeholder="Step Name"
                />
              )}
            </div>
            <div className="node-editor-content">
              {state.isReadonly ? (
                <div className="content-display">{selectedNodeData.content}</div>
              ) : (
                <textarea
                  className="content-textarea"
                  value={selectedNodeData.content}
                  onChange={(e) => {
                    if (selectedNode) {
                      handleUpdateNode(selectedNode, { content: e.target.value });
                    }
                  }}
                  placeholder="Enter prompt content..."
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Inject styles
injectStyles(variablesStyles + baseStyles + commonStyles + workflowStyles);

// Mount
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<WorkflowEditorApp />);
}
