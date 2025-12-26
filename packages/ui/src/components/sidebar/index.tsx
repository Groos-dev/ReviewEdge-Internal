import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
// Note: codicon.css is loaded by the extension via webview HTML
import '../../styles/variables.css';
import '../../styles/base.css';
import '../../styles/common.css';
import '../../styles/sidebar.css';
import type { ReviewTask, Workflow } from '../../types/config';

// VS Code API
declare const acquireVsCodeApi: () => {
  postMessage: (message: WebviewMessage) => void;
  getState: () => SidebarState | undefined;
  setState: (state: SidebarState) => void;
};

const vscode = acquireVsCodeApi();

// Types
interface SidebarState {
  workflows: readonly Workflow[];
  tasks: readonly ReviewTask[];
}

interface WebviewMessage {
  command: string;
  id?: string;
}

const DEFAULT_WORKFLOW_ID = 'default';

// Codicon component for VS Code icons
const Icon: FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <i className={`codicon codicon-${name} ${className}`} />
);

// Main Component
const SidebarApp: FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'workflows'>('tasks');
  const [state, setState] = useState<SidebarState>({
    workflows: [],
    tasks: [],
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'refresh') {
        setState(message.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendMessage = (command: string, id?: string) => {
    vscode.postMessage({ command, id });
  };

  return (
    <div className="sidebar-container">
      <div className="header">
        <div className="tabs">
          <button
            type="button"
            className={`tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            <Icon name="tasklist" />
            <span>Tasks</span>
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'workflows' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflows')}
          >
            <Icon name="symbol-event" />
            <span>Workflows</span>
          </button>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="header-action"
            onClick={() => sendMessage(activeTab === 'tasks' ? 'createTask' : 'createWorkflow')}
            title={activeTab === 'tasks' ? 'New Task' : 'New Workflow'}
          >
            <Icon name="add" />
          </button>
          <button
            type="button"
            className="header-action"
            onClick={() => sendMessage('openSettings')}
            title="Settings"
          >
            <Icon name="settings-gear" />
          </button>
        </div>
      </div>

      {activeTab === 'tasks' ? (
        <TasksView tasks={state.tasks} workflows={state.workflows} sendMessage={sendMessage} />
      ) : (
        <WorkflowsView workflows={state.workflows} sendMessage={sendMessage} />
      )}
    </div>
  );
};

// Tasks View
interface TasksViewProps {
  tasks: readonly ReviewTask[];
  workflows: readonly Workflow[];
  sendMessage: (command: string, id?: string) => void;
}

const TasksView: FC<TasksViewProps> = ({ tasks, workflows, sendMessage }) => {
  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Icon name="tasklist" />
        </div>
        <div className="empty-state-title">No review tasks</div>
        <div className="empty-state-desc">Create a task to start reviewing code</div>
      </div>
    );
  }

  return (
    <div className="content">
      {tasks.map((task) => {
        const workflow = workflows.find((w) => w.id === task.workflowId);

        return (
          <div
            key={task.id}
            className="task-card"
            onClick={() => sendMessage('viewTaskDiff', task.id)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage('viewTaskDiff', task.id)}
            tabIndex={0}
            role="button"
          >
            {/* Card Header - Branch Flow */}
            <div className="task-card-header">
              <div className="task-title">
                <Icon name="git-pull-request" className="task-icon" />
                <span className="branch-name source">{task.headBranch}</span>
              </div>

              {/* Hover Actions */}
              <div className="task-actions">
                <button
                  type="button"
                  className="action-btn primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('runTask', task.id);
                  }}
                  title="Run Review"
                >
                  <Icon name="play" />
                </button>
                <button
                  type="button"
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('editTask', task.id);
                  }}
                  title="Edit"
                >
                  <Icon name="pencil" />
                </button>
                <button
                  type="button"
                  className="action-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('deleteTask', task.id);
                  }}
                  title="Delete"
                >
                  <Icon name="trash" />
                </button>
              </div>
            </div>

            {/* Target Branch */}
            <div className="task-target">
              <span className="target-arrow">↳</span>
              <span className="target-label">into</span>
              <span className="branch-name target">{task.baseBranch}</span>
            </div>

            {/* Metadata Row */}
            <div className="task-meta">
              <span className="commit-hash">{task.headCommit.substring(0, 7)}</span>
              <span className="meta-separator">•</span>
              {workflow ? (
                <button
                  type="button"
                  className="workflow-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('openWorkflow', workflow.id);
                  }}
                  title="View workflow"
                >
                  <Icon name="pass-filled" className="workflow-icon active" />
                  <span>{workflow.name}</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="workflow-link empty"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('selectWorkflowForTask', task.id);
                  }}
                  title="Select workflow"
                >
                  <Icon name="error" className="workflow-icon" />
                  <span>No workflow</span>
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Workflows View
interface WorkflowsViewProps {
  workflows: readonly Workflow[];
  sendMessage: (command: string, id?: string) => void;
}

const WorkflowsView: FC<WorkflowsViewProps> = ({ workflows, sendMessage }) => {
  if (workflows.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Icon name="symbol-event" />
        </div>
        <div className="empty-state-title">No workflows yet</div>
        <div className="empty-state-desc">Create a workflow to define your review process</div>
      </div>
    );
  }

  const sortedWorkflows = [...workflows].sort((a, b) => {
    if (a.id === DEFAULT_WORKFLOW_ID) return -1;
    if (b.id === DEFAULT_WORKFLOW_ID) return 1;
    return 0;
  });

  return (
    <div className="content">
      {sortedWorkflows.map((workflow) => {
        const isDefault = workflow.id === DEFAULT_WORKFLOW_ID;

        return (
          <div key={workflow.id} className={`workflow-card ${isDefault ? 'default' : ''}`}>
            <div className="workflow-card-header">
              <button
                type="button"
                className="workflow-title"
                onClick={() => sendMessage('openWorkflow', workflow.id)}
              >
                <Icon
                  name={isDefault ? 'verified-filled' : 'symbol-event'}
                  className="workflow-title-icon"
                />
                <span>{workflow.name}</span>
                {isDefault && <span className="default-badge">Default</span>}
              </button>

              <div className="workflow-actions">
                <button
                  type="button"
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('openWorkflow', workflow.id);
                  }}
                  title="Edit Workflow"
                >
                  <Icon name="pencil" />
                </button>
                {!isDefault && (
                  <button
                    type="button"
                    className="action-btn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendMessage('deleteWorkflow', workflow.id);
                    }}
                    title="Delete"
                  >
                    <Icon name="trash" />
                  </button>
                )}
              </div>
            </div>

            <div className="workflow-meta">
              <span className="step-count">
                <Icon name="list-tree" />
                {workflow.nodes.length} step{workflow.nodes.length !== 1 ? 's' : ''}
              </span>
              <span className="meta-separator">•</span>
              <span className="update-time">
                {new Date(workflow.updatedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>

            {workflow.nodes.length > 0 && (
              <div className="workflow-steps">
                {workflow.nodes.slice(0, 3).map((node, index) => (
                  <span key={node.id} className="step-badge">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-name">{node.name}</span>
                  </span>
                ))}
                {workflow.nodes.length > 3 && (
                  <span className="step-more">+{workflow.nodes.length - 3}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Mount
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<SidebarApp />);
}
