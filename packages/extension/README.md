# ReviewEdge (VS Code Extension)

AI-powered code review using the Model Context Protocol (MCP). Review results render directly in VS Code diff views and a dedicated sidebar.

## Usage

### 1) Open the ReviewEdge view

- Open the Activity Bar and select `ReviewEdge`.
- The view lists your review `Workflows` and `Tasks`.

### 2) (Optional) Connect Cursor via MCP

If you use Cursor to run the review, generate the MCP config from the view:

- In the ReviewEdge view, open settings → `Configure MCP Server`.
- Choose `Copy Config`, then paste it into Cursor: Settings → Features → MCP.

### 3) Create a workflow

- Create a workflow from the view (or use an existing one) to define how the review is executed.

### 4) Create a review task

- Create a task from the view:
  - `Quick Create`: current branch → `mcpCodeReview.mainBranch` (latest commits)
  - `Advanced`: pick base/head branches and commits
- Assign a workflow to the task.

### 5) Run the review and view results

- Run the task from the view. The extension copies an instruction to your clipboard; paste it into Cursor to start the review.
- Use `View Diff` on the task to open the diff viewer.
- Use the command `MCP: Render Review Comments` to select a task and load its saved comments.

## Features

- Review changed files/commits and render inline/diff comments
- Customizable workflows (prompt steps + variables)
- Local persistence for reviews/workflows

## Commands

- `MCP: Render Review Comments`
- `MCP: Clear Review Comments`

## Settings

- `mcpCodeReview.mainBranch`: main branch name for comparisons
- `mcpCodeReview.severityLevel`: minimum severity to display
- `mcpCodeReview.serverPath`: custom MCP server path (optional)

## Development

See the repository README for build and packaging instructions.
