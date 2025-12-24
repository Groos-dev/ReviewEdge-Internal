import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import baseStyles from '../../styles/base.css?raw';
import commonStyles from '../../styles/common.css?raw';
import sidebarStyles from '../../styles/sidebar.css?raw';
import variablesStyles from '../../styles/variables.css?raw';
import type { ReviewTask, Workflow } from '../../types/config';
import { injectStyles } from '../../utils/injectStyles';

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
            📋 Tasks
          </button>
          <button
            type="button"
            className={`tab ${activeTab === 'workflows' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflows')}
          >
            🔄 Workflows
          </button>
        </div>
        <button
          type="button"
          className="settings-btn"
          onClick={() => sendMessage('openSettings')}
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {activeTab === 'tasks' ? (
        <TasksView tasks={state.tasks} workflows={state.workflows} sendMessage={sendMessage} />
      ) : (
        <WorkflowsView workflows={state.workflows} sendMessage={sendMessage} />
      )}

      <button
        type="button"
        className="add-btn"
        onClick={() => sendMessage(activeTab === 'tasks' ? 'createTask' : 'createWorkflow')}
        title={activeTab === 'tasks' ? 'Create Task' : 'Create Workflow'}
      >
        +
      </button>
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
        <div className="empty-state-icon">📋</div>
        <div>No review tasks</div>
        <div style={{ fontSize: '11px', marginTop: '8px' }}>
          Create a task to start reviewing code
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {tasks.map((task) => {
        const workflow = workflows.find((w) => w.id === task.workflowId);

        return (
          <div key={task.id} className="list-item">
            <div className="item-header">
              <button
                type="button"
                className="item-name"
                onClick={() => sendMessage('openTask', task.id)}
              >
                {task.name}
              </button>
              <div className="item-actions">
                <button
                  type="button"
                  className="icon-btn run-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('runTask', task.id);
                  }}
                  title="Run Review"
                >
                  ▶️
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('selectWorkflowForTask', task.id);
                  }}
                  title="Select Workflow"
                >
                  🔄
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('editTask', task.id);
                  }}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('deleteTask', task.id);
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            <button
              type="button"
              className="task-branches"
              onClick={() => sendMessage('openTask', task.id)}
            >
              <span className="branch-tag">{task.headBranch}</span>
              <span className="commit-tag">{task.headCommit.substring(0, 7)}</span>
              <span className="arrow">→</span>
              <span className="branch-tag">{task.baseBranch}</span>
              <span className="commit-tag">{task.baseCommit.substring(0, 7)}</span>
            </button>

            {workflow ? (
              <div className="workflow-info">
                🔄{' '}
                <button
                  type="button"
                  className="workflow-name"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('openWorkflow', workflow.id);
                  }}
                  title="View workflow"
                >
                  {workflow.name}
                </button>
              </div>
            ) : (
              <div className="workflow-info">
                <button
                  type="button"
                  className="workflow-empty"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('selectWorkflowForTask', task.id);
                  }}
                  title="Select workflow"
                >
                  No workflow
                </button>
              </div>
            )}
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
        <div className="empty-state-icon">🔄</div>
        <div>No workflows yet</div>
        <div style={{ fontSize: '11px', marginTop: '8px' }}>
          Create a workflow to define your review process
        </div>
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
          <button
            type="button"
            key={workflow.id}
            className={`list-item ${isDefault ? 'default-workflow' : ''}`}
            onClick={() => sendMessage('openWorkflow', workflow.id)}
          >
            <div className="item-header">
              <div className="item-name">
                {workflow.name}
                {isDefault && <span className="system-badge">系统默认</span>}
              </div>
              <div className="item-actions">
                {!isDefault && (
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendMessage('deleteWorkflow', workflow.id);
                    }}
                    title="Delete"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>

            <div className="item-detail">
              {workflow.nodes.length} step(s) • Updated:{' '}
              {new Date(workflow.updatedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>

            <div className="workflow-nodes">
              {workflow.nodes.length > 0 ? (
                workflow.nodes.map((node) => (
                  <span key={node.id} className="node-badge">
                    {node.name}
                  </span>
                ))
              ) : (
                <span
                  style={{
                    fontSize: '11px',
                    color: 'var(--vscode-descriptionForeground)',
                  }}
                >
                  No steps defined
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// Inject styles
injectStyles(variablesStyles + baseStyles + commonStyles + sidebarStyles);

// Mount
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<SidebarApp />);
}
