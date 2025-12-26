# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Build all packages
npm run build

# Build individual packages
npm run build:server
npm run build:extension

# Watch mode for extension development
npm run dev:extension

# Type checking
npm run type-check

# Linting (Biome)
npm run lint
npm run lint:fix
```

### Packaging
```bash
# Package extension for VSCode
npm run package
npm run package:extension
```

## Architecture

This is an MCP (Model Context Protocol) code review tool with a clean separation between UI and business logic.

### Three-Package Structure

**Server Package** (`packages/server/`)
- Pure TypeScript with strong typing (no React/VSCode dependencies)
- Implements MCP protocol via `@modelcontextprotocol/sdk`
- Contains all business logic in `CodeReviewCore` class
- Database operations via `TaskReader` (SQLite using sql.js)
- Exports `index.ts` as standalone MCP server binary

**Extension Package** (`packages/extension/`)
- VSCode extension that consumes the server code in-process
- `InProcessMessenger` enables direct communication (no subprocess overhead)
- React-based webview UI for sidebar, diff viewer, and workflow editor
- Services layer (`CodeReviewClient`, `TaskService`, `GitService`) wraps the core

**UI Package** (`packages/ui/`)
- Shared React components used by extension webviews
- Built with Vite, outputs to extension's dist directory
- Uses Monaco Editor and git-diff-view for code visualization

### Communication Architecture

The extension runs the server code **in-process** rather than spawning a separate MCP server process:
1. `extension.ts` creates `InProcessMessenger<ToServerProtocol, FromServerProtocol>`
2. Instantiates `CodeReviewCore` with the messenger
3. `CodeReviewClient` wraps the messenger for type-safe IPC calls
4. Protocol types defined in `server/src/protocol/types.ts`

This design enables:
- Fast in-process communication (no stdio overhead)
- Type-safe request/response patterns
- Shared core between MCP server and VSCode extension
- Easy testing of business logic independently

### Domain Model

**Workflows**: Define review steps with customizable prompts
- Built-in workflows cannot be deleted
- Each workflow has ordered nodes with name/content
- Support variable substitution: `{{base_branch}}`, `{{base_commit}}`, etc.

**Tasks**: Represent a code review session
- Link git commits (base → head) with a workflow
- Track review progress across workflow steps

**Comments**: Review feedback attached to files
- Severity levels: INFO, WARNING, CRITICAL
- Include optional code suggestions
- Deduplicated by content hash

### Key Files

- `packages/server/src/index.ts` - MCP server entry point with tool handlers
- `packages/server/src/core/CodeReviewCore.ts` - Business logic orchestrator
- `packages/server/src/protocol/types.ts` - Type-safe IPC protocol definitions
- `packages/extension/src/extension.ts` - VSCode extension activation
- `packages/extension/src/services/CodeReviewClient.ts` - Client wrapper for core

## Technology Stack

- **TypeScript** 5.9+ - Strong typing throughout
- **MCP SDK** - Model Context Protocol server implementation
- **React 18** - UI components
- **sql.js** - SQLite database for in-browser data storage
- **Zod** - Schema validation
- **Vite** - UI build tool
- **tsup** - Server/extension bundling
- **Biome** - Linting and formatting (replaces ESLint/Prettier)

## Build System Notes

- Extension build copies server output (`copy:server`) and UI build (`copy:ui`) into its dist
- All packages use ES modules (`"type": "module"`)
- Node 20+ required
- Workspace links packages via `workspaces: ["packages/*"]`
