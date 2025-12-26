# MCP Code Review

> AI-powered code review tool using Model Context Protocol (MCP) and VSCode

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue)](https://www.typescriptlang.org/)
[![VSCode](https://img.shields.io/badge/VSCode-Extension-green)](https://code.visualstudio.com/)

## 🚀 Features

- **AI-Powered Analysis**: Leverages Claude AI through the Model Context Protocol for intelligent code reviews
- **Customizable Workflows**: Create and manage review workflows with tailored prompts
- **Seamless VSCode Integration**: Native sidebar, diff viewer, and workflow editor
- **Git Integration**: Automatically analyzes commits, branches, and changed files
- **Review Deduplication**: Smart comment deduplication to avoid repetitive feedback
- **Persistent Storage**: SQLite-based storage for reviews, workflows, and comments

## 📋 Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Development](#development)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Contributing](#contributing)
- [License](#license)

## 📦 Installation

### Prerequisites

- Node.js 20+
- VSCode
- Git

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/new-codereview-mcp.git
cd new-codereview-mcp

# Install dependencies
npm install

# Build all packages
npm run build

# Package the extension
npm run package:extension
```

### Install in VSCode

1. Open VSCode
2. Go to Extensions → Install from VSIX
3. Select the generated `.vsix` file from `packages/extension/dist/`

## 🎯 Quick Start

### Basic Usage

1. **Open the Sidebar**: Click the "MCP Code Review" icon in the VSCode sidebar
2. **Select a Workflow**: Choose a review workflow (e.g., "Standard Review", "Security Focus")
3. **Configure Review**: Select base and head commits/branches
4. **Start Review**: Click "Start Review" to analyze the changes
5. **View Results**: See comments in the diff viewer with severity levels

### Creating Custom Workflows

1. Open the MCP Code Review sidebar
2. Click the "Workflows" tab
3. Click "Create Workflow"
4. Add review steps with custom prompts
5. Use variables like `{{base_branch}}`, `{{head_commit}}` for dynamic values

## 🏗️ Architecture

This project follows a **clean separation of concerns** with three distinct packages:

### Three-Package Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Code Review                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │   Extension      │         │      UI          │         │
│  │   (VSCode)       │◄────────┤   (React)        │         │
│  │                  │         │                  │         │
│  │  - Activation    │         │  - Components    │         │
│  │  - Providers     │         │  - Styles        │         │
│  │  - Commands      │         │  - Build Output  │         │
│  └────────┬─────────┘         └──────────────────┘         │
│           │                                                   │
│           │ In-Process Messenger                            │
│           │ (Direct Communication)                          │
│           ▼                                                   │
│  ┌──────────────────┐                                       │
│  │     Server       │                                       │
│  │   (Business)     │                                       │
│  │                  │                                       │
│  │  - Core Logic    │                                       │
│  │  - Database      │                                       │
│  │  - MCP Protocol  │                                       │
│  └──────────────────┘                                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Extension Package (`packages/extension/`)

**Purpose**: VSCode integration and UI orchestration

**Key Components**:
- **extension.ts**: Entry point, handles activation and dependency registration
- **Providers**: Sidebar, DiffViewer, and WorkflowEditor webview providers
- **Services**: CodeReviewClient, TaskService, GitService
- **Commands**: Task and workflow command handlers

**Communication**: Uses `InProcessMessenger` for direct in-memory communication with the server (no subprocess overhead)

### Server Package (`packages/server/`)

**Purpose**: Pure business logic and MCP protocol implementation

**Key Components**:
- **CodeReviewCore**: Main business logic orchestrator
- **TaskReader**: SQLite database operations via sql.js
- **Protocol Types**: Type-safe IPC communication layer
- **MCP Tools**: Server entry point with tool handlers

**Design Philosophy**:
- Pure TypeScript (no React/VSCode dependencies)
- Strong typing with Zod schema validation
- Testable business logic independent of UI framework
- Can run as standalone MCP server or in-process

### UI Package (`packages/ui/`)

**Purpose**: Shared React components for extension webviews

**Key Components**:
- **Sidebar**: Main review interface with task list
- **DiffViewer**: Git diff visualization with comments
- **WorkflowEditor**: Visual workflow creation and editing
- **Monaco Editor**: Code editor integration
- **git-diff-view**: Diff rendering library

**Build System**:
- Vite for fast development builds
- Outputs to extension's dist directory
- Hot reload support during development

## 💻 Development

### Environment Setup

```bash
# Install dependencies
npm install

# Verify installation
npm run type-check
```

### Development Workflow

```bash
# Watch mode for UI development (auto-rebuild on changes)
npm run dev:extension

# Watch mode for server development
npm run dev:server

# Type checking
npm run type-check

# Linting (Biome)
npm run lint
npm run lint:fix
```

### Building

```bash
# Build all packages
npm run build

# Build individual packages
npm run build:server
npm run build:extension
npm run build:ui

# Package extension for distribution
npm run package:extension
```

### Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
new-codereview-mcp/
├── packages/
│   ├── extension/              # VSCode extension package
│   │   ├── src/
│   │   │   ├── commands/       # Command handlers
│   │   │   │   ├── taskCommands.ts
│   │   │   │   └── workflowCommands.ts
│   │   │   ├── providers/      # Webview providers
│   │   │   │   ├── SidebarProvider.ts
│   │   │   │   ├── DiffViewerProvider.ts
│   │   │   │   └── WorkflowEditorProvider.ts
│   │   │   ├── services/       # Business services
│   │   │   │   ├── CodeReviewClient.ts
│   │   │   │   ├── TaskService.ts
│   │   │   │   └── GitService.ts
│   │   │   ├── utils/          # Utility functions
│   │   │   │   └── webviewHtml.ts
│   │   │   └── extension.ts    # Extension entry point
│   │   ├── scripts/            # Build scripts
│   │   │   ├── copy-ui.mjs
│   │   │   └── copy-server.mjs
│   │   └── package.json
│   │
│   ├── server/                 # MCP server package
│   │   ├── src/
│   │   │   ├── core/           # Core business logic
│   │   │   │   └── CodeReviewCore.ts
│   │   │   ├── database/       # Database operations
│   │   │   │   ├── TaskReader.ts
│   │   │   │   └── schema.sql
│   │   │   ├── protocol/       # Communication layer
│   │   │   │   ├── types.ts
│   │   │   │   └── InProcessMessenger.ts
│   │   │   ├── types/          # Domain types
│   │   │   │   ├── review.ts
│   │   │   │   ├── workflow.ts
│   │   │   │   └── task.ts
│   │   │   └── index.ts        # MCP server entry
│   │   └── package.json
│   │
│   └── ui/                     # React UI components
│       ├── src/
│       │   ├── components/
│       │   │   ├── sidebar/    # Sidebar component
│       │   │   ├── diffviewer/ # Diff viewer component
│       │   │   ├── workflow/   # Workflow editor component
│       │   │   └── mcpsetup/   # MCP setup component
│       │   └── styles/
│       │       ├── sidebar.css
│       │       ├── diffviewer.css
│       │       └── mcpsetup.css
│       ├── vite.config.ts
│       └── package.json
│
├── CLAUDE.md                   # Project guidance for Claude Code
├── README.md                   # This file
├── CONTRIBUTING.md             # Contribution guidelines
├── package.json                # Workspace root
├── tsconfig.json               # TypeScript configuration
├── biome.jsonc                 # Linting and formatting config
└── npmgjson                    # Workspace configuration
```

## 🛠️ Tech Stack

### Core Technologies

- **TypeScript 5.9+** - Strong typing and modern JavaScript features
- **Node.js 20+** - Runtime environment
- **React 18** - UI component library
- **MCP SDK** - Model Context Protocol server implementation

### Database & Storage

- **sql.js** - SQLite for in-browser data storage
- **SQLite3** - Server-side database (via sql.js)

### Validation & Schema

- **Zod** - Runtime type validation and schema definitions

### Build & Tooling

- **Vite** - Fast UI build tool with hot module replacement
- **tsup** - TypeScript bundler for server/extension
- **Biome** - Fast linter and formatter (replaces ESLint/Prettier)
- **TypeScript** - Static type checking

### Editor Integration

- **VSCode Extension API** - Editor integration
- **Monaco Editor** - Code editor component
- **git-diff-view** - Diff visualization library

### UI Libraries

- **React 18** - Component framework
- **@vscode/codicons** - VSCode icon set

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Guidelines

- Follow the existing code style (enforced by Biome)
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Respect the separation of concerns between packages

### Code of Conduct

Be respectful, inclusive, and constructive. We're all here to build something great together.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Model Context Protocol** - For enabling AI-tool integration
- **Claude AI** - For powering the code review analysis
- **VSCode Team** - For the excellent extension API
- **Open Source Community** - For the amazing tools and libraries

## 📞 Support

- **Issues**: Report bugs and request features on [GitHub Issues](https://github.com/yourusername/new-codereview-mcp/issues)
- **Discussions**: Ask questions and share ideas on [GitHub Discussions](https://github.com/yourusername/new-codereview-mcp/discussions)

---

Made with ❤️ by the MCP Code Review team
