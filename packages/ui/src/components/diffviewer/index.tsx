import { DiffFile, DiffModeEnum, DiffView } from '@git-diff-view/react';
import {
  memo,
  StrictMode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import { createRoot } from 'react-dom/client';
import '@git-diff-view/react/styles/diff-view.css';
import '../../styles/diffviewer.css';

function SplitViewIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      className={`view-icon view-icon-split ${active ? 'active' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M896 164H128a36 36 0 0 1 0-72h768a36 36 0 0 1 0 72zM896 932H128a36 36 0 0 1 0-72h768a36 36 0 0 1 0 72zM736 644H288c-55.16 0-100-44.84-100-100v-64c0-55.16 44.84-100 100-100h448c55.16 0 100 44.84 100 100v64c0 55.16-44.84 100-100 100zM288 452c-15.44 0-28 12.56-28 28v64c0 15.44 12.56 28 28 28h448c15.44 0 28-12.56 28-28v-64c0-15.44-12.56-28-28-28H288z"
        fill="currentColor"
      />
    </svg>
  );
}

// SVG Icon for Unified View (stacked/vertical)
function UnifiedViewIcon({ active }: { active?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      className={`view-icon ${active ? 'active' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M896 164H128a36 36 0 0 1 0-72h768a36 36 0 0 1 0 72zM896 932H128a36 36 0 0 1 0-72h768a36 36 0 0 1 0 72zM736 644H288c-55.16 0-100-44.84-100-100v-64c0-55.16 44.84-100 100-100h448c55.16 0 100 44.84 100 100v64c0 55.16-44.84 100-100 100zM288 452c-15.44 0-28 12.56-28 28v64c0 15.44 12.56 28 28 28h448c15.44 0 28-12.56 28-28v-64c0-15.44-12.56-28-28-28H288z"
        fill="currentColor"
      />
    </svg>
  );
}

// Hook to detect VS Code theme
function useVSCodeTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const body = document.body;
    if (body.classList.contains('vscode-dark') || body.classList.contains('vscode-high-contrast')) {
      return 'dark';
    }
    if (
      body.classList.contains('vscode-light') ||
      body.classList.contains('vscode-high-contrast-light')
    ) {
      return 'light';
    }
    return 'dark';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const body = document.body;
      if (
        body.classList.contains('vscode-dark') ||
        body.classList.contains('vscode-high-contrast')
      ) {
        setTheme('dark');
      } else if (
        body.classList.contains('vscode-light') ||
        body.classList.contains('vscode-high-contrast-light')
      ) {
        setTheme('light');
      }
    });

    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

interface DiffData {
  oldFile?: {
    fileName?: string;
    fileLang?: string;
    content?: string;
  };
  newFile?: {
    fileName?: string;
    fileLang?: string;
    content?: string;
  };
  hunks: string[];
  oldPath?: string;
  newPath?: string;
}

// Message types for line number click navigation
interface GotoLineMessage {
  command: 'gotoLine';
  filePath: string;
  line: number;
  side: 'old' | 'new';
}

type ReviewSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface ReviewComment {
  id: string;
  taskId: string;
  filePath: string;
  line: number;
  severity: ReviewSeverity;
  category: string;
  comment: string;
  suggestion?: string;
  resolved?: boolean;
  createdAt: number;
}

interface DiffResponse {
  files: DiffData[];
  comments: ReviewComment[];
}

// Group comments by file path
function groupCommentsByFile(comments: ReviewComment[]): Map<string, ReviewComment[]> {
  const grouped = new Map<string, ReviewComment[]>();
  for (const comment of comments) {
    const existing = grouped.get(comment.filePath) || [];
    existing.push(comment);
    grouped.set(comment.filePath, existing);
  }
  return grouped;
}

declare global {
  interface Window {
    acquireVsCodeApi: () => VSCodeAPI;
  }
}

interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

const vscode = window.acquireVsCodeApi();

// Helper function to create DiffFile instance from diff data
function createDiffFileInstance(data: DiffData): DiffFile | null {
  try {
    const diffString = data.hunks.join('\n');

    const diffFile = DiffFile.createInstance({
      newFile: data.newFile
        ? {
            fileName: data.newFile.fileName || data.newPath || 'unknown',
            fileLang: data.newFile.fileLang,
            content: data.newFile.content,
          }
        : undefined,
      oldFile: data.oldFile
        ? {
            fileName: data.oldFile.fileName || data.oldPath || 'unknown',
            fileLang: data.oldFile.fileLang,
            content: data.oldFile.content,
          }
        : undefined,
      hunks: [diffString],
    });

    if (diffFile) {
      diffFile.init();
      diffFile.buildSplitDiffLines();
      diffFile.buildUnifiedDiffLines();
    }

    return diffFile;
  } catch (e) {
    console.error('[DiffViewer] Failed to create DiffFile instance:', e);
    return null;
  }
}

// Hook for lazy loading with IntersectionObserver
function useLazyLoad(rootMargin = '200px') {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Once visible, stop observing
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, isVisible };
}

// Severity badge component
function SeverityBadge({ severity }: { severity: ReviewSeverity }) {
  const classMap: Record<ReviewSeverity, string> = {
    CRITICAL: 'severity-critical',
    WARNING: 'severity-warning',
    INFO: 'severity-info',
  };
  return <span className={`severity-badge ${classMap[severity]}`}>{severity}</span>;
}

// Type for extendData used by git-diff-view
type ExtendData = {
  oldFile?: Record<string, { data: ReviewComment[] }>;
  newFile?: Record<string, { data: ReviewComment[] }>;
};

// Convert comments array to extendData format (grouped by line number)
function commentsToExtendData(comments: ReviewComment[]): ExtendData {
  const extendData: ExtendData = { oldFile: {}, newFile: {} };

  for (const comment of comments) {
    const lineKey = String(comment.line);
    // Comments are typically for new file lines
    if (!extendData.newFile) extendData.newFile = {};
    if (!extendData.newFile[lineKey]) {
      extendData.newFile[lineKey] = { data: [] };
    }
    extendData.newFile[lineKey].data.push(comment);
  }

  return extendData;
}

// Inline comment renderer for renderExtendLine
function InlineCommentRenderer({ data }: { data: ReviewComment[] }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="inline-comments-container">
      {data.map((comment) => (
        <div
          key={comment.id}
          className={`inline-comment inline-comment-${comment.severity.toLowerCase()}`}
        >
          <div className="inline-comment-header">
            <SeverityBadge severity={comment.severity} />
            <span className="inline-comment-category">{comment.category}</span>
          </div>
          <div className="inline-comment-body">{comment.comment}</div>
          {comment.suggestion && (
            <div className="inline-comment-suggestion">
              <span className="suggestion-label">Suggestion:</span>
              <pre className="suggestion-code">{comment.suggestion}</pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Handle line number click - navigate to file in VS Code
function handleLineNumberClick(
  event: React.MouseEvent<HTMLDivElement>,
  filePath: string,
  viewMode: DiffModeEnum
): void {
  const target = event.target as HTMLElement;

  // Check if clicked on a line number element
  // Split View: data-line-num attribute
  // Unified View: data-line-old-num or data-line-new-num attribute
  const lineNumAttr = target.getAttribute('data-line-num');
  const lineOldNumAttr = target.getAttribute('data-line-old-num');
  const lineNewNumAttr = target.getAttribute('data-line-new-num');

  if (!lineNumAttr && !lineOldNumAttr && !lineNewNumAttr) {
    return; // Not a line number element
  }

  let lineNumber: number | null = null;
  let side: 'old' | 'new' = 'new';

  if (viewMode === DiffModeEnum.Split) {
    // Split View: determine side by finding parent with data-side attribute
    if (lineNumAttr) {
      lineNumber = Number.parseInt(lineNumAttr, 10);

      // Find the side by looking for parent with data-mode or data-side attribute
      let parent: HTMLElement | null = target;
      while (parent) {
        const dataMode = parent.getAttribute('data-mode');
        const dataSide = parent.getAttribute('data-side');
        if (dataMode === 'old' || dataSide === 'old') {
          side = 'old';
          break;
        }
        if (dataMode === 'new' || dataSide === 'new') {
          side = 'new';
          break;
        }
        // Also check for table wrapper class names
        if (
          parent.classList.contains('old-diff-table-wrapper') ||
          parent.classList.contains('old-diff-table')
        ) {
          side = 'old';
          break;
        }
        if (
          parent.classList.contains('new-diff-table-wrapper') ||
          parent.classList.contains('new-diff-table')
        ) {
          side = 'new';
          break;
        }
        parent = parent.parentElement;
      }
    }
  } else {
    // Unified View: check which attribute was clicked
    if (lineNewNumAttr) {
      lineNumber = Number.parseInt(lineNewNumAttr, 10);
      side = 'new';
    } else if (lineOldNumAttr) {
      lineNumber = Number.parseInt(lineOldNumAttr, 10);
      side = 'old';
    }
  }

  if (lineNumber === null || Number.isNaN(lineNumber)) {
    return;
  }

  // For now, only support new side (worktree) navigation
  if (side === 'old') {
    // TODO: In the future, implement old side navigation with git show scheme
    console.log('[DiffViewer] Old side navigation not yet supported');
    return;
  }

  // Send message to VS Code to open file at line
  const message: GotoLineMessage = {
    command: 'gotoLine',
    filePath,
    line: lineNumber,
    side,
  };

  vscode.postMessage(message);
}

const MemoizedDiffView = memo(function MemoizedDiffView({
  diffFile,
  viewMode,
  highlight,
  wrap,
  theme,
  comments,
  filePath,
}: {
  diffFile: DiffFile;
  viewMode: DiffModeEnum;
  highlight: boolean;
  wrap: boolean;
  theme: 'light' | 'dark';
  comments: ReviewComment[];
  filePath: string;
}) {
  // Convert comments to extendData format
  const extendData = useMemo(() => commentsToExtendData(comments), [comments]);

  // Event handler for line number clicks (event delegation)
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      handleLineNumberClick(event, filePath, viewMode);
    },
    [filePath, viewMode]
  );

  // Keyboard handler for accessibility (Enter/Space to activate)
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        // Simulate click on the focused element
        const target = event.target as HTMLElement;
        const mouseEvent = {
          target,
          currentTarget: event.currentTarget,
        } as unknown as React.MouseEvent<HTMLDivElement>;
        handleLineNumberClick(mouseEvent, filePath, viewMode);
      }
    },
    [filePath, viewMode]
  );

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: Event delegation pattern for line number navigation
    <div
      className="diff-view-clickable"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      <DiffView
        diffFile={diffFile}
        diffViewMode={viewMode}
        diffViewHighlight={highlight}
        diffViewWrap={wrap}
        diffViewTheme={theme}
        extendData={extendData}
        renderExtendLine={({ data }) => <InlineCommentRenderer data={data} />}
      />
    </div>
  );
});

// Component to render a single diff file with collapse/expand functionality
const DiffFileView = memo(function DiffFileView({
  data,
  viewMode,
  wrap,
  theme,
  highlight,
  comments = [],
  defaultCollapsed = false,
}: {
  data: DiffData;
  viewMode: DiffModeEnum;
  wrap: boolean;
  theme: 'light' | 'dark';
  highlight: boolean;
  comments?: ReviewComment[];
  defaultCollapsed?: boolean;
}) {
  const diffFile = useMemo(() => createDiffFileInstance(data), [data]);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [expandAll, setExpandAll] = useState(false);
  const { ref, isVisible } = useLazyLoad();

  const fileName =
    data.newPath || data.newFile?.fileName || data.oldPath || data.oldFile?.fileName || 'unknown';

  useEffect(() => {
    if (diffFile) {
      const updateExpandState = () => {
        if (viewMode === DiffModeEnum.Unified) {
          setExpandAll(diffFile.hasExpandUnifiedAll);
        } else {
          setExpandAll(diffFile.hasExpandSplitAll);
        }
      };

      updateExpandState();
      const unsubscribe = diffFile.subscribe(updateExpandState);
      return () => {
        unsubscribe?.();
      };
    }
    return undefined;
  }, [diffFile, viewMode]);

  const toggleExpandAll = useCallback(() => {
    if (diffFile) {
      const mode = viewMode === DiffModeEnum.Unified ? 'unified' : 'split';
      if (expandAll) {
        diffFile.onAllCollapse(mode);
      } else {
        diffFile.onAllExpand(mode);
      }
      setExpandAll(!expandAll);
    }
  }, [diffFile, viewMode, expandAll]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  if (!diffFile) {
    return (
      <div className="file-diff" ref={ref}>
        <div className="file-header">
          <span className="file-path">{fileName}</span>
        </div>
        <div className="error-state">
          <p>Failed to parse diff for this file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="file-diff" ref={ref}>
      <div className="file-header">
        <div className="file-header-left">
          <button
            type="button"
            className="collapse-toggle"
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand file' : 'Collapse file'}
          >
            <span className={`collapse-icon ${collapsed ? 'collapsed' : ''}`}>▼</span>
          </button>
          <span className="file-path">{fileName}</span>
          {comments.length > 0 && <span className="file-comments-badge">{comments.length}</span>}
        </div>
        <div className="file-header-right">
          {!collapsed && (
            <button
              type="button"
              className="file-action-button"
              onClick={toggleExpandAll}
              title={expandAll ? 'Collapse expanded lines' : 'Expand all lines'}
            >
              {expandAll ? '↕ Collapse Lines' : '↕ Expand Lines'}
            </button>
          )}
        </div>
      </div>
      {!collapsed && isVisible && (
        <div className="file-diff-content">
          <MemoizedDiffView
            diffFile={diffFile}
            viewMode={viewMode}
            highlight={highlight}
            wrap={wrap}
            theme={theme}
            comments={comments}
            filePath={fileName}
          />
        </div>
      )}
      {!collapsed && !isVisible && (
        <div className="diff-placeholder">
          <div className="loading-spinner" />
        </div>
      )}
    </div>
  );
});

function DiffViewerApp() {
  const [diffFiles, setDiffFiles] = useState<DiffData[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [viewMode, setViewMode] = useState<DiffModeEnum>(DiffModeEnum.Split);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const theme = useVSCodeTheme();

  // Default settings - wrap disabled, highlight enabled
  const wrap = false;
  const highlight = true;

  // Group comments by file path
  const commentsByFile = useMemo(() => groupCommentsByFile(comments), [comments]);

  // Handle view mode change with transition to avoid blocking UI
  const handleViewModeChange = useCallback((mode: DiffModeEnum) => {
    startTransition(() => {
      setViewMode(mode);
    });
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case 'setDiffData': {
          const data: DiffResponse = message.data;
          setDiffFiles(data.files || []);
          setComments(data.comments || []);
          setLoading(false);
          setError(null);
          console.log(
            '[DiffViewer] Loaded',
            data.files?.length,
            'files,',
            data.comments?.length,
            'comments'
          );
          break;
        }
        case 'error':
          setError(message.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    vscode.postMessage({ command: 'ready' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (loading) {
    return (
      <div className="diff-viewer-container">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading diff...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diff-viewer-container">
        <div className="error-state">
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (diffFiles.length === 0) {
    return (
      <div className="diff-viewer-container">
        <div className="empty-state">
          <p>No diff data available</p>
        </div>
      </div>
    );
  }

  // Helper to get comments for a file
  const getFileComments = (filePath: string): ReviewComment[] => {
    return commentsByFile.get(filePath) || [];
  };

  return (
    <div className="diff-viewer-container">
      <div className="diff-viewer-toolbar">
        <div className="toolbar-left">
          <span className="file-count">{diffFiles.length} file(s) changed</span>
          {comments.length > 0 && (
            <span className="comments-count-badge">{comments.length} comment(s)</span>
          )}
          {isPending && <span className="switching-indicator">Switching...</span>}
        </div>
        <div className="toolbar-right">
          {/* View Mode Toggle Icons */}
          <div className="view-toggle-group">
            <button
              type="button"
              className={`icon-button ${viewMode === DiffModeEnum.Split ? 'active' : ''}`}
              onClick={() => handleViewModeChange(DiffModeEnum.Split)}
              title="Split View (Side by Side)"
              disabled={isPending}
            >
              <SplitViewIcon active={viewMode === DiffModeEnum.Split} />
            </button>
            <button
              type="button"
              className={`icon-button ${viewMode === DiffModeEnum.Unified ? 'active' : ''}`}
              onClick={() => handleViewModeChange(DiffModeEnum.Unified)}
              title="Unified View (Inline)"
              disabled={isPending}
            >
              <UnifiedViewIcon active={viewMode === DiffModeEnum.Unified} />
            </button>
          </div>
        </div>
      </div>
      <div className="diff-viewer-content">
        {diffFiles.map((file, index) => {
          const filePath = file.newPath || file.oldPath || '';
          return (
            <DiffFileView
              key={`${filePath || index}`}
              data={file}
              viewMode={viewMode}
              wrap={wrap}
              theme={theme}
              highlight={highlight}
              comments={getFileComments(filePath)}
            />
          );
        })}
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <DiffViewerApp />
    </StrictMode>
  );
}
