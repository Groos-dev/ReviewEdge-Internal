# Contributing to MCP Code Review

Thank you for your interest in contributing to MCP Code Review! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Architecture Understanding](#architecture-understanding)

## 🤝 Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- Be respectful and considerate
- Use inclusive language
- Focus on constructive feedback
- Help others learn and grow

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Git
- VSCode (recommended)
- Familiarity with TypeScript and React

### Initial Setup

```bash
# Fork and clone the repository
git clone git@github.com:Groos-dev/ReviewEdge-Internal.git
cd ReviewEdge-Internal

# Install dependencies
npm install

# Set up your development environment
npm run build
```

### Recommended VSCode Extensions

- **Biome** - Linting and formatting
- **TypeScript** - Type checking
- **ES7+ React/Redux/React-Native snippets** - React development

## 🔄 Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation changes
- `test/` - Test additions or updates

### 2. Development Loop

```bash
# Watch mode for UI development
npm run dev:extension

# Watch mode for server development
npm run dev:server

# Type checking in another terminal
npm run type-check -- --watch

# Linting
npm run lint -- --watch
```

### 3. Test Your Changes

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Type check
npm run type-check

# Lint
npm run lint
```

### 4. Build Before Pushing

```bash
# Build all packages
npm run build

# Verify the build succeeds
npm run package:extension
```

## 📐 Coding Standards

### TypeScript Guidelines

1. **Type Safety**: Always use TypeScript types. Avoid `any` unless absolutely necessary
2. **Interfaces vs Types**: Use `interface` for object shapes, `type` for unions and aliases
3. **Null Checks**: Enable strict null checks and handle undefined appropriately
4. **Async/Await**: Prefer async/await over promises

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
  email?: string;
}

async function getUser(id: string): Promise<User | null> {
  const user = await database.findUser(id);
  return user ?? null;
}

// ❌ Bad
function getUser(id: any): any {
  return database.findUser(id);
}
```

### React Guidelines

1. **Functional Components**: Use functional components with hooks
2. **Props Destructuring**: Destructure props in function signature
3. **State Management**: Use appropriate hooks (useState, useReducer, useContext)
4. **Effect Dependencies**: Always include all dependencies in useEffect

```typescript
// ✅ Good
interface SidebarProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
}

export function Sidebar({ tasks, onSelectTask }: SidebarProps) {
  useEffect(() => {
    // Load tasks on mount
    loadTasks();
  }, []); // Empty dependency array for mount-only

  return <div>{/* ... */}</div>;
}

// ❌ Bad
export class Sidebar extends React.Component {
  render() {
    return <div>{/* ... */}</div>;
  }
}
```

### Code Organization

1. **File Structure**: Organize by feature/domain, not by file type
2. **Exports**: Use named exports for components, default exports for pages
3. **Imports**: Group imports: external → internal → types

```typescript
// ✅ Good import organization
import { useState, useEffect } from 'react';
import { Button } from '@ui/components';
import type { Task, Workflow } from '@shared/types';

import { TaskService } from '../services/TaskService';
import { useTasks } from '../hooks/useTasks';
```

### Naming Conventions

- **Files**: `kebab-case.ts` or `kebab-case.tsx`
- **Components**: `PascalCase` (e.g., `SidebarProvider.tsx`)
- **Functions/Variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **Private Members**: Prefix with `_`

```typescript
const MAX_RETRIES = 3;

interface TaskData {
  id: string;
  status: TaskStatus;
}

function processTask(taskId: string): void {
  let _retryCount = 0;
  // ...
}
```

### Error Handling

1. **Typed Errors**: Create custom error classes
2. **Error Propagation**: Propagate errors appropriately
3. **User Feedback**: Provide user-friendly error messages

```typescript
// ✅ Good
class TaskNotFoundError extends Error {
  constructor(taskId: string) {
    super(`Task not found: ${taskId}`);
    this.name = 'TaskNotFoundError';
  }
}

async function getTask(id: string): Promise<Task> {
  const task = await taskRepository.find(id);
  if (!task) {
    throw new TaskNotFoundError(id);
  }
  return task;
}
```

### Comments and Documentation

1. **JSDoc**: Document public APIs with JSDoc comments
2. **TODO Comments**: Use `TODO(reason): description` format
3. **Complex Logic**: Explain WHY, not WHAT

```typescript
/**
 * Creates a new code review task with the given parameters.
 *
 * @param baseBranch - The base branch to compare against
 * @param headCommit - The head commit to review
 * @param workflowId - The workflow to use for the review
 * @returns The created task with its assigned ID
 * @throws {Error} If the workflow is not found
 */
async function createTask(
  baseBranch: string,
  headCommit: string,
  workflowId: string
): Promise<Task> {
  // We need to validate the workflow first to ensure
  // the task is created with a valid configuration
  const workflow = await getWorkflow(workflowId);
  // ...
}
```

## 🧪 Testing Guidelines

### Test Organization

```
packages/
  server/
    src/
      core/
        CodeReviewCore.ts
      __tests__/
        core/
          CodeReviewCore.test.ts
```

### Writing Tests

```typescript
describe('CodeReviewCore', () => {
  describe('createTask', () => {
    it('should create a task with valid parameters', async () => {
      // Arrange
      const core = new CodeReviewCore(mockDatabase);
      const params = {
        baseBranch: 'main',
        headCommit: 'abc123',
        workflowId: 'workflow-1',
      };

      // Act
      const task = await core.createTask(params);

      // Assert
      expect(task.id).toBeDefined();
      expect(task.baseBranch).toBe('main');
    });

    it('should throw error for non-existent workflow', async () => {
      // Arrange
      const core = new CodeReviewCore(mockDatabase);
      const params = {
        baseBranch: 'main',
        headCommit: 'abc123',
        workflowId: 'non-existent',
      };

      // Act & Assert
      await expect(core.createTask(params)).rejects.toThrow(
        'Workflow not found'
      );
    });
  });
});
```

### Test Coverage Goals

- **Core Logic**: 90%+ coverage
- **UI Components**: 70%+ coverage
- **Utilities**: 95%+ coverage

## 📝 Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or tooling changes
- `perf`: Performance improvements

### Examples

```bash
# Feature
git commit -m "feat(server): add workflow duplication feature"

# Bug fix
git commit -m "fix(ui): resolve task list not updating after creation"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Refactoring
git commit -m "refactor(core): extract prompt building logic to PromptBuilder"
```

### Commit Best Practices

- **Present Tense**: Use "add" not "added" or "adds"
- **Imperative Mood**: Use "move" not "moves" or "moving"
- **Specific Scope**: Include the package/area affected
- **Body Details**: Add body for complex changes explaining WHY

```bash
git commit -m "feat(server): implement comment deduplication

Add deduplication logic based on content hash to prevent
duplicate comments from being stored in the database.

This improves the review experience by showing only unique
feedback and reduces storage requirements.

Closes #123"
```

## 🔄 Pull Request Process

### Before Submitting

1. **Update Documentation**: Update README, docs, and comments
2. **Add Tests**: Ensure all new code has tests
3. **Run Checks**: All tests must pass, no lint errors
4. **Build**: Verify the build succeeds
5. **Self-Review**: Review your own changes first

### Creating a Pull Request

1. **Descriptive Title**: Follow commit conventions
   ```
   feat(server): add workflow duplication feature
   ```

2. **Template**: Fill out the PR template

   ```markdown
   ## Description
   Brief description of the changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests added/updated
   - [ ] Integration tests added/updated
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] No new warnings generated
   ```

### Review Process

1. **Automatic Checks**: CI will run tests and linting
2. **Code Review**: Maintainers will review your code
3. **Address Feedback**: Make requested changes
4. **Approval**: One maintainer approval required
5. **Merge**: Squash and merge to main branch

### Requesting Review

Tag relevant reviewers based on changes:
- `@maintainer-team` for server changes
- `@ui-team` for UI component changes
- `@docs-team` for documentation changes

## 🏗️ Architecture Understanding

### Three-Package Architecture

Understanding the separation is crucial for contributing correctly:

#### Server Package (`packages/server/`)
- **What goes here**: Pure business logic, database operations, MCP protocol
- **What NOT to put here**: VSCode API calls, React components, UI-specific logic
- **Dependencies**: Pure TypeScript, no React/VSCode dependencies

```typescript
// ✅ Good - Server package
export class CodeReviewCore {
  async createTask(params: CreateTaskParams): Promise<Task> {
    // Pure business logic
  }
}

// ❌ Bad - Server package (don't do this)
import * as vscode from 'vscode'; // NO VSCode API in server
```

#### Extension Package (`packages/extension/`)
- **What goes here**: VSCode API integration, command registration, provider initialization
- **What NOT to put here**: Business logic (delegate to server), React components (use UI package)
- **Dependencies**: VSCode API, Server code (via InProcessMessenger)

```typescript
// ✅ Good - Extension package
import * as vscode from 'vscode';
import { CodeReviewCore } from '@server/core';

export async function activate(context: vscode.ExtensionContext) {
  const core = new CodeReviewCore(messenger);
  // Register commands, providers
}

// ❌ Bad - Extension package (don't do this)
export function calculateReviewScore() { ... } // Put in server package
```

#### UI Package (`packages/ui/`)
- **What goes here**: React components, styles, component-specific logic
- **What NOT to put here**: Business logic, VSCode API calls
- **Dependencies**: React, UI libraries

```typescript
// ✅ Good - UI package
import { useState } from 'react';

export function Sidebar({ tasks }: SidebarProps) {
  const [selected, setSelected] = useState<Task | null>(null);
  return <div>{/* UI only */}</div>;
}

// ❌ Bad - UI package (don't do this)
import * as vscode from 'vscode'; // NO VSCode API in UI
const task = await database.query(...); // NO direct DB access
```

### Communication Flow

```
UI Component (React)
    ↓ (user action)
Extension Command/Provider
    ↓ (InProcessMessenger)
Server Business Logic
    ↓
Database/MCP Protocol
```

When adding features, follow this flow and respect package boundaries.

## 🐛 Debugging Tips

### VSCode Extension Development

```bash
# Press F5 in VSCode to launch Extension Development Host
# This opens a new VSCode instance with your extension loaded

# Check logs
View → Output → Select "Extension Host" channel
```

### Server Development

```bash
# Add debug logs (remove before committing)
console.log('[Debug] Function reached', { variable });

# Use TypeScript debugger
# Set breakpoints in .ts files
```

### Common Issues

**Build Failures**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear build cache: `npm run clean`
- Check TypeScript errors: `npm run type-check`

**Extension Not Loading**:
- Check Extension Host output for errors
- Verify package.json has correct activation events
- Ensure all dependencies are built

**UI Not Updating**:
- Check state management in React components
- Verify message passing between extension and webview
- Look for console errors in webview DevTools

## 💡 Tips for Good Contributions

1. **Start Small**: Fix a bug or improve documentation first
2. **Ask Questions**: Open a discussion for complex changes
3. **Learn the Codebase**: Explore existing patterns before adding new code
4. **Test Thoroughly**: Manual testing is as important as automated tests
5. **Document Changes**: Help others understand your work
6. **Be Patient**: Reviewers may take time to provide feedback

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev/)
- [VSCode Extension API](https://code.visualstudio.com/api)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Conventional Commits](https://www.conventionalcommits.org/)

## 🎯 Common Contribution Areas

Looking for somewhere to contribute? Here are ideas:

- **Tests**: Add tests to increase coverage
- **Documentation**: Improve guides and add examples
- **Performance**: Profile and optimize bottlenecks
- **Accessibility**: Improve keyboard navigation and screen reader support
- **Features**: Check [GitHub Issues](https://github.com/Groos-dev/ReviewEdge-Internal/issues) for feature requests
- **Bug Fixes**: Look for issues labeled "good first issue"

## 📧 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and ideas
- **Code Reviews**: Request help via pull request comments

---

Thank you for contributing to MCP Code Review! Your contributions make this project better for everyone. 🙏
