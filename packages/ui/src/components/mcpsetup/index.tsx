/**
 * MCP Setup Guide Component
 *
 * Step-by-step guide for configuring MCP Server in Cursor.
 * Uses VS Code native styling for theme compatibility.
 */

import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../styles/variables.css';
import '../../styles/base.css';
import '../../styles/common.css';
import '../../styles/mcpsetup.css';

interface VsCodeApi {
  postMessage: (message: OutgoingMessage) => void;
  getState: () => SetupState | undefined;
  setState: (state: SetupState) => void;
}

interface SetupState {
  configJson: string;
  serverPath: string;
}

interface OutgoingMessage {
  command: string;
}

interface IncomingMessage {
  command: string;
  data?: SetupState;
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

// Codicon component
const Icon: FC<{ name: string; className?: string }> = ({ name, className = '' }) => (
  <i className={`codicon codicon-${name} ${className}`} />
);

// Step component
interface StepProps {
  number: number;
  title: string;
  children: React.ReactNode;
  isLast?: boolean;
}

const Step: FC<StepProps> = ({ number, title, children, isLast = false }) => (
  <div className={`setup-step ${isLast ? 'last' : ''}`}>
    <div className="step-indicator">
      <div className="step-number">{number}</div>
      {!isLast && <div className="step-line" />}
    </div>
    <div className="step-content">
      <h3 className="step-title">{title}</h3>
      <div className="step-body">{children}</div>
    </div>
  </div>
);

// Main Component
const McpSetupApp: FC = () => {
  const [state, setState] = useState<SetupState | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<IncomingMessage>) => {
      const message = event.data;
      if (message.command === 'initialize' && message.data) {
        setState(message.data);
        vscode.setState(message.data);
      }
    };

    window.addEventListener('message', handleMessage);

    // Request initialization
    vscode.postMessage({ command: 'ready' });

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCopy = async () => {
    if (!state) return;

    try {
      await navigator.clipboard.writeText(state.configJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments where clipboard API is restricted
      vscode.postMessage({ command: 'copyConfig' });
    }
  };

  if (!state) {
    return (
      <div className="setup-container">
        <div className="loading">
          <Icon name="loading" className="spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-container">
      {/* Header */}
      <div className="setup-header">
        <div className="header-icon">
          <Icon name="plug" />
        </div>
        <div className="header-content">
          <h1>Configure MCP Server</h1>
          <p className="header-desc">
            Follow these steps to enable AI-powered code review in Cursor
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="info-banner">
        <Icon name="info" className="banner-icon" />
        <div className="banner-content">
          <strong>Configuration Ready</strong>
          <span>Copy the config below and add it to Cursor's MCP settings</span>
        </div>
      </div>

      {/* Steps */}
      <div className="setup-steps">
        <Step number={1} title="Copy Configuration">
          <p>Click the button to copy the MCP server configuration:</p>
          <button type="button" className="copy-btn" onClick={handleCopy}>
            <Icon name={copied ? 'check' : 'copy'} />
            <span>{copied ? 'Copied!' : 'Copy Config'}</span>
          </button>
          <div className="config-block">
            <div className="config-header">
              <Icon name="json" />
              <span>mcp-codereview.json</span>
            </div>
            <pre className="config-content">{state.configJson}</pre>
          </div>
        </Step>

        <Step number={2} title="Open Cursor MCP Settings">
          <p>In Cursor, navigate to MCP configuration:</p>
          <ol className="instruction-list">
            <li>
              <Icon name="gear" className="list-icon" />
              <span>
                Open <code>Cursor Settings</code> (<kbd>⌘</kbd>+<kbd>,</kbd> or <kbd>Ctrl</kbd>+
                <kbd>,</kbd>)
              </span>
            </li>
            <li>
              <Icon name="arrow-right" className="list-icon" />
              <span>
                Navigate to <code>Features → MCP</code>
              </span>
            </li>
            <li>
              <Icon name="search" className="list-icon" />
              <span>Or search for "MCP" in settings</span>
            </li>
          </ol>
        </Step>

        <Step number={3} title="Add Configuration">
          <p>
            Paste the copied configuration into the MCP Settings JSON. Make sure to merge it with
            any existing configuration.
          </p>
        </Step>

        <Step number={4} title="Restart Cursor" isLast>
          <p>Restart Cursor to apply the changes and activate the MCP server.</p>
        </Step>
      </div>

      {/* Server Path Info */}
      <div className="path-info">
        <Icon name="folder" className="path-icon" />
        <div className="path-content">
          <span className="path-label">Server Path</span>
          <code className="path-value">{state.serverPath}</code>
        </div>
      </div>

      {/* Verification Section */}
      <div className="verify-section">
        <h2>
          <Icon name="verified" />
          <span>Verify Installation</span>
        </h2>
        <p>
          In Cursor's chat, type <code>@</code> and look for MCP tools like <code>codereview</code>,{' '}
          <code>add_review_comment</code>, etc.
        </p>
      </div>
    </div>
  );
};

// Mount
const root = document.getElementById('root');
if (root) {
  createRoot(root).render(<McpSetupApp />);
}
