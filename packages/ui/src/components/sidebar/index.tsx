import type { FC } from 'react';
import { Fragment, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
// Note: codicon.css is loaded by the extension via webview HTML
import '../../styles/variables.css';
import '../../styles/base.css';
import '../../styles/common.css';
import '../../styles/sidebar.css';
import type { ReviewTask, Workflow } from '../../types/config';

interface VsCodeApi {
  postMessage: (message: WebviewMessage) => void;
  getState: () => SidebarState | undefined;
  setState: (state: SidebarState) => void;
}

declare const acquireVsCodeApi: () => VsCodeApi;

const vscode: VsCodeApi = (() => {
  const win = window as Window & { vscodeApi?: VsCodeApi };
  if (win.vscodeApi) {
    return win.vscodeApi;
  }
  const api = acquireVsCodeApi();
  win.vscodeApi = api;
  return api;
})();

interface SidebarState {
  workflows: readonly Workflow[];
  tasks: readonly ReviewTask[];
}

interface WebviewMessage {
  command: string;
  id?: string;
}

const BUILTIN_WORKFLOW_IDS = {
  DEFAULT: 'default',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  IDIOMATIC: 'idiomatic',
  FULL_REVIEW: 'full-review',
} as const;

const BUILTIN_WORKFLOW_ID_LIST = Object.values(BUILTIN_WORKFLOW_IDS);

// Codicon component for VS Code icons
const Icon: FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <i className={`codicon codicon-${name} ${className}`} />
);

const getPipelineIcon = (nodeName: string) => {
  const normalized = nodeName.trim().toLowerCase();

  if (normalized.includes('context') || normalized.includes('scope')) return 'telescope';
  if (normalized.includes('security') || normalized.includes('vuln')) return 'shield';
  if (normalized.includes('review') || normalized.includes('audit')) return 'eye';
  if (normalized.includes('refactor') || normalized.includes('cleanup')) return 'wand';
  if (normalized.includes('style') || normalized.includes('format') || normalized.includes('lint'))
    return 'paintcan';
  if (normalized.includes('summary') || normalized.includes('summarize')) return 'note';
  if (normalized.includes('chat') || normalized.includes('discuss')) return 'comment';

  return 'symbol-misc';
};

// Safely get initial state from cache - handles corrupted/old format data
const getInitialState = (): SidebarState => {
  try {
    const cached = vscode.getState();
    // Validate cached data structure
    if (cached && Array.isArray(cached.workflows) && Array.isArray(cached.tasks)) {
      return cached;
    }
  } catch (e) {
    console.warn('[Sidebar] Failed to restore state:', e);
  }
  return { workflows: [], tasks: [] };
};

// Main Component
const SidebarApp: FC = () => {
  const [activeTab, setActiveTab] = useState<'tasks' | 'workflows'>('tasks');
  const [state, setState] = useState<SidebarState>(getInitialState);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'refresh') {
        // Update state and persist to cache
        const newState = message.data as SidebarState;
        setState(newState);
        vscode.setState(newState);
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
          <div key={task.id} className="task-card">
            <button
              type="button"
              className="task-card-hitarea"
              onClick={() => sendMessage('viewTaskDiff', task.id)}
              aria-label={`View diff for ${task.headBranch}`}
            />
            <div className="task-card-content">
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
    // Built-in workflows come first, in their predefined order
    const aBuiltinIdx = BUILTIN_WORKFLOW_ID_LIST.indexOf(a.id);
    const bBuiltinIdx = BUILTIN_WORKFLOW_ID_LIST.indexOf(b.id);
    if (aBuiltinIdx !== -1 && bBuiltinIdx !== -1) return aBuiltinIdx - bBuiltinIdx;
    if (aBuiltinIdx !== -1) return -1;
    if (bBuiltinIdx !== -1) return 1;
    return 0;
  });

  return (
    <div className="content">
      {sortedWorkflows.map((workflow) => {
        const isBuiltin = BUILTIN_WORKFLOW_ID_LIST.includes(workflow.id);
        const isDefault = workflow.id === BUILTIN_WORKFLOW_IDS.DEFAULT;
        const orderedNodes = [...workflow.nodes].sort((a, b) => a.order - b.order);
        const maxVisibleNodes = 5;
        const visibleNodes =
          orderedNodes.length <= maxVisibleNodes
            ? orderedNodes
            : orderedNodes.slice(0, maxVisibleNodes - 1);
        const hiddenCount = Math.max(0, orderedNodes.length - visibleNodes.length);

        return (
          <div key={workflow.id} className={`workflow-card ${isBuiltin ? 'builtin' : ''}`}>
            <div className="workflow-card-header">
              <button
                type="button"
                className="workflow-title"
                onClick={() => sendMessage('openWorkflow', workflow.id)}
              >
                <Icon
                  name={isBuiltin ? 'verified-filled' : 'beaker'}
                  className={`workflow-title-icon ${isBuiltin ? 'official' : 'custom'}`}
                />
                <span>{workflow.name}</span>
                {isDefault && <span className="default-suffix">(Default)</span>}
              </button>

              <div className="workflow-actions">
                <button
                  type="button"
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    sendMessage('openWorkflow', workflow.id);
                  }}
                  title={isBuiltin ? 'View Workflow' : 'Edit Workflow'}
                >
                  <Icon name={isBuiltin ? 'eye' : 'pencil'} />
                </button>
                {!isBuiltin && (
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

            {orderedNodes.length > 0 && (
              <div className="workflow-pipeline">
                {visibleNodes.map((node, index) => (
                  <Fragment key={node.id}>
                    <span className="pipeline-node" title={node.name}>
                      <Icon name={getPipelineIcon(node.name)} className="pipeline-node-icon" />
                      <span className="pipeline-node-label">{node.name}</span>
                    </span>
                    {index < visibleNodes.length - 1 && (
                      <Icon name="arrow-right" className="pipeline-arrow" />
                    )}
                  </Fragment>
                ))}
                {hiddenCount > 0 && (
                  <>
                    <Icon name="arrow-right" className="pipeline-arrow" />
                    <span className="pipeline-more" title={`${hiddenCount} more step(s)`}>
                      <Icon name="ellipsis" className="pipeline-more-icon" />
                      <span>+{hiddenCount}</span>
                    </span>
                  </>
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
