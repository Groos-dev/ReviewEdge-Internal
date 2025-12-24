import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import baseStyles from '../../styles/base.css?raw';
import commonStyles from '../../styles/common.css?raw';
import diffviewerStyles from '../../styles/diffviewer.css?raw';
import variablesStyles from '../../styles/variables.css?raw';
import type { ReviewComment, ReviewTask } from '../../types/config';
import { injectStyles } from '../../utils/injectStyles';

// VS Code API
declare const acquireVsCodeApi: () => {
  postMessage: (message: WebviewMessage) => void;
  getState: () => DiffViewerState | undefined;
  setState: (state: DiffViewerState) => void;
};

const vscode = acquireVsCodeApi();

// Types
interface DiffViewerState {
  task: ReviewTask;
  changedFiles: readonly ChangedFile[];
  comments: readonly ReviewComment[];
  selectedFile: string | null;
}

interface ChangedFile {
  readonly path: string;
  readonly status: 'A' | 'M' | 'D' | 'R';
  readonly additions: number;
  readonly deletions: number;
}

interface WebviewMessage {
  command: string;
  filePath?: string;
}

// Main Component
const DiffViewerApp: FC = () => {
  const [state, setState] = useState<DiffViewerState | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === 'initialize') {
        setState(message.data);
      } else if (message.command === 'updateComments') {
        setState((prev) => (prev ? { ...prev, comments: message.comments } : null));
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'ready' });
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!state) {
    return <div className="loading">Loading...</div>;
  }

  const sendMessage = (command: string, filePath?: string) => {
    vscode.postMessage({ command, filePath });
  };

  return (
    <div className="diffviewer-container">
      <div className="diffviewer-header">
        <div className="task-info">
          <h2>{state.task.name}</h2>
          <div className="branch-info">
            <span className="branch-tag">{state.task.headBranch}</span>
            <span className="commit">{state.task.headCommit.substring(0, 7)}</span>
            <span className="arrow">→</span>
            <span className="branch-tag">{state.task.baseBranch}</span>
            <span className="commit">{state.task.baseCommit.substring(0, 7)}</span>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => sendMessage('renderComments')}
          >
            Render Comments
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => sendMessage('refreshComments')}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="main-content">
        <FileList
          files={state.changedFiles}
          comments={state.comments}
          selectedFile={state.selectedFile}
          onSelectFile={(path) => sendMessage('selectFile', path)}
          onOpenFile={(path) => sendMessage('openFile', path)}
        />

        {state.selectedFile && (
          <FileComments
            file={state.selectedFile}
            comments={state.comments.filter((c) => c.filePath === state.selectedFile)}
            onViewInEditor={(path, _line) => sendMessage('viewInEditor', path)}
          />
        )}
      </div>
    </div>
  );
};

// File List Component
interface FileListProps {
  files: readonly ChangedFile[];
  comments: readonly ReviewComment[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  onOpenFile: (path: string) => void;
}

const FileList: FC<FileListProps> = ({
  files,
  comments,
  selectedFile,
  onSelectFile,
  onOpenFile,
}) => {
  const getCommentCount = (filePath: string) => {
    return comments.filter((c) => c.filePath === filePath).length;
  };

  const getStatusIcon = (status: ChangedFile['status']) => {
    switch (status) {
      case 'A':
        return '✚';
      case 'M':
        return '✎';
      case 'D':
        return '✖';
      case 'R':
        return '↻';
      default:
        return '•';
    }
  };

  const getStatusClass = (status: ChangedFile['status']) => {
    switch (status) {
      case 'A':
        return 'added';
      case 'M':
        return 'modified';
      case 'D':
        return 'deleted';
      case 'R':
        return 'renamed';
      default:
        return '';
    }
  };

  return (
    <div className="file-list">
      <div className="file-list-header">
        <h3>Changed Files ({files.length})</h3>
      </div>
      <div className="file-list-content">
        {files.map((file) => {
          const commentCount = getCommentCount(file.path);
          const isSelected = selectedFile === file.path;

          return (
            <button
              key={file.path}
              type="button"
              className={`file-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectFile(file.path)}
              onDoubleClick={() => onOpenFile(file.path)}
            >
              <div className="file-info">
                <span className={`status-icon ${getStatusClass(file.status)}`}>
                  {getStatusIcon(file.status)}
                </span>
                <span className="file-path" title={file.path}>
                  {file.path.split('/').pop()}
                </span>
                {commentCount > 0 && <span className="comment-badge">{commentCount}</span>}
              </div>
              <div className="file-stats">
                <span className="additions">+{file.additions}</span>
                <span className="deletions">-{file.deletions}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// File Comments Component
interface FileCommentsProps {
  file: string;
  comments: readonly ReviewComment[];
  onViewInEditor: (path: string, line: number) => void;
}

const FileComments: FC<FileCommentsProps> = ({ file, comments, onViewInEditor }) => {
  const getSeverityClass = (severity: ReviewComment['severity']) => {
    return severity.toLowerCase();
  };

  const getSeverityIcon = (severity: ReviewComment['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return '🔴';
      case 'WARNING':
        return '🟡';
      case 'INFO':
        return '🔵';
      default:
        return '⚪';
    }
  };

  if (comments.length === 0) {
    return (
      <div className="file-comments">
        <div className="file-comments-header">
          <h3>{file.split('/').pop()}</h3>
        </div>
        <div className="no-comments">No comments for this file</div>
      </div>
    );
  }

  const sortedComments = [...comments].sort((a, b) => a.line - b.line);

  return (
    <div className="file-comments">
      <div className="file-comments-header">
        <h3>{file.split('/').pop()}</h3>
        <span className="comment-count">{comments.length} comment(s)</span>
      </div>
      <div className="comments-list">
        {sortedComments.map((comment) => (
          <div
            key={comment.id}
            className={`comment-item severity-${getSeverityClass(comment.severity)}`}
          >
            <div className="comment-header">
              <span className="severity-badge">
                {getSeverityIcon(comment.severity)} {comment.severity}
              </span>
              <span className="category-badge">{comment.category}</span>
              <button
                className="line-number"
                onClick={() => onViewInEditor(file, comment.line)}
                title="View in editor"
                type="button"
              >
                Line {comment.line}
              </button>
            </div>
            <div className="comment-body">
              <p>{comment.comment}</p>
              {comment.suggestion && (
                <div className="suggestion">
                  <div className="suggestion-label">💡 Suggestion:</div>
                  <pre>{comment.suggestion}</pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Inject styles
injectStyles(variablesStyles + baseStyles + commonStyles + diffviewerStyles);

// Mount
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<DiffViewerApp />);
}
