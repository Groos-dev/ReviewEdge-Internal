# Prompt Templates

This directory contains system prompt templates for Code Review MCP. Using Markdown format makes it easy for non-developers to maintain.

## Directory Structure

```
prompts/
├── README.md           # This document
├── index.ts            # Template export module
├── markdown.d.ts       # TypeScript type declarations
├── preamble.md         # Task context header
├── step-content.md     # Current step content wrapper
├── tool-instructions.md # Tool usage instructions
├── continuation.md     # Continue to next step directive
└── completion.md       # Final completion directive
```

## Template Files

### preamble.md
Task context and workflow progress header. Displayed first on every `codereview` tool call.

### step-content.md
Wraps the current step content. `{{step_content}}` is replaced with the actual workflow node prompt.

### tool-instructions.md
Instructs the AI Agent on how to use `add_review_comment` and `add_review_comments` tools.

### continuation.md
Suffix for non-final steps, directing the AI Agent to call the next step after completing the current one.

### completion.md
Suffix for the final step, informing the AI Agent that the workflow is complete.

## Available Template Variables

| Variable | Description |
|----------|-------------|
| `{{task_id}}` | Review task ID |
| `{{task_name}}` | Task display name |
| `{{base_branch}}` | Base branch name |
| `{{base_commit}}` | Full base commit hash |
| `{{base_commit_short}}` | Short base commit hash (7 chars) |
| `{{head_branch}}` | Head branch name |
| `{{head_commit}}` | Full head commit hash |
| `{{head_commit_short}}` | Short head commit hash (7 chars) |
| `{{workflow_name}}` | Workflow display name |
| `{{current_step}}` | Current step number (1-based) |
| `{{total_steps}}` | Total number of steps |
| `{{steps_overview}}` | Formatted step list |
| `{{step_name}}` | Current step name |
| `{{step_content}}` | Current step content |
| `{{workspace_path}}` | Workspace path |
| `{{next_step}}` | Next step index (0-based) |

## Modification Guide

1. **Edit prompt text**: Directly edit the corresponding `.md` file
2. **Rebuild**: Run `npm run build --workspace=packages/server`
3. **Test**: Test MCP tool calls in VS Code

### Notes

- Keep the `{{variable_name}}` format intact, otherwise variable substitution will fail
- Markdown format is passed as-is to the AI, ensure correct formatting
- Changes require a rebuild to take effect
