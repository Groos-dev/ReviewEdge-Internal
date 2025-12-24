# MCP Code Review

AI-powered code review tool using Model Context Protocol (MCP).

## Architecture

This project follows a clean separation of concerns:

- **Extension Package** (`packages/extension/`) - UI layer with React components
- **Server Package** (`packages/server/`) - Business logic and MCP protocol implementation

### Extension (UI Layer)

- Built with React + TypeScript
- Provides VSCode webview interfaces
- Handles user interactions
- Communicates with server via MCP

### Server (Logic Layer)

- Pure TypeScript with strong typing
- Implements MCP protocol
- Contains all business logic
- Manages database operations
- Generates code review prompts

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Watch mode for extension development
npm run dev:extension

# Package extension
npm run package:extension
```

## Project Structure

```
new-codereview-mcp/
├── packages/
│   ├── extension/          # VSCode extension (React UI)
│   │   ├── src/
│   │   │   ├── providers/  # VSCode view providers
│   │   │   ├── server/     # MCP client for server process
│   │   │   ├── types/      # TypeScript types
│   │   │   ├── webview/    # React webviews (sidebar/diff/workflow)
│   │   │   └── extension.ts # Entry point
│   │   └── package.json
│   └── server/             # MCP server (Business logic)
│       ├── src/
│       │   ├── database/   # Database operations
│       │   ├── types/      # Domain types
│       │   ├── schemas.ts  # Zod schemas
│       │   └── index.ts    # MCP server entry
│       └── package.json
└── package.json            # Workspace root
```

## Tech Stack

- **TypeScript** - Strong typing throughout
- **React** - UI components
- **Zod** - Schema validation
- **MCP SDK** - Model Context Protocol
- **sql.js** - SQLite database
- **VSCode Extension API** - Editor integration
