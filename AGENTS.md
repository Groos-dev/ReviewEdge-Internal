# Repository Guidelines

## Project Structure & Module Organization

- `packages/server/`: MCP server (TypeScript) with core review logic, protocol wiring, and SQLite access (`src/core/`, `src/protocol/`, `src/database/`).
- `packages/extension/`: VS Code extension (TypeScript) that hosts webviews and talks to the server (`src/providers/`, `src/services/`, `src/extension.ts`).
- `packages/ui/`: React UI built in Vite library mode and copied into the extension for webviews (`src/components/`, `src/styles/`).
- Build outputs live under `**/dist/` (and `packages/extension/dist/{server,webview}`); don’t hand-edit generated files.

## Build, Test, and Development Commands

Run from the repo root unless noted.

- `npm install`: install workspace dependencies.
- `npm run build`: build all packages (workspaces).
- `npm run dev:server`: watch/build the MCP server.
- `npm run dev:extension`: watch/build the extension bundle.
- `npm run lint` / `npm run lint:fix`: run Biome checks (optionally auto-fix).
- `npm run type-check`: run `tsc` for `packages/server` and `packages/extension`.
- `npm run package`: build + package a `.vsix` (see `scripts/package.sh`).

Examples (workspace-scoped): `npm --workspace packages/ui run dev`, `npm --workspace packages/server run build`.

## Coding Style & Naming Conventions

- Use Node `>=20` and TypeScript throughout.
- Formatting/linting is enforced by Biome (`biome.json`): 2-space indents, single quotes, ~100 char lines.
- File naming follows existing patterns: `PascalCase.ts` for providers/services/core modules, lowercase for `index.ts`, `schemas.ts`, and `types/*.ts`. React entrypoints are typically `packages/ui/src/components/<feature>/index.tsx`.

## Testing Guidelines

- No dedicated test runner is configured yet; treat `npm run type-check` + `npm run lint` as required pre-PR checks.
- If you introduce tests, keep them close to the package they cover (e.g., `packages/server/src/**/__tests__/`) and add a workspace `test` script.

## Commit & Pull Request Guidelines

- Commit messages in this repo use short, imperative subjects (e.g., “Add task update functionality”). Keep the first line focused.
- PRs should include: what/why, how to verify (commands + steps), and screenshots/GIFs for webview/UI changes.
- If you change protocol/types or stored data, call it out explicitly and keep changes coordinated across server, extension, and UI.

## Security & Configuration Tips

- Don’t commit secrets. Prefer environment/configuration through VS Code settings and local dev files.
- Keep `packages/server/src/database/schema.sql` changes additive to avoid breaking existing user data.
