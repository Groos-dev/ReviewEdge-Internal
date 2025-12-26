## 🛠️ How to Add Review Comments

### Get Code Changes First
```bash
git diff {{base_commit}} {{head_commit}}
```

### Adding Comments

**Single Comment:**
```
add_review_comment(
  taskId: "{{task_id}}",
  workspacePath: "{{workspace_path}}",
  filePath: "path/to/file.ts",
  line: 10,
  severity: "WARNING",  // INFO | WARNING | CRITICAL
  category: "Security",  // Security | Performance | Style | Logic | etc.
  comment: "Description of the issue",
  suggestion: "Optional: suggested fix or improvement"
)
```

**Batch Comments (Recommended for multiple findings):**
```
add_review_comments(
  taskId: "{{task_id}}",
  workspacePath: "{{workspace_path}}",
  comments: [
    { filePath: "...", line: 10, severity: "WARNING", category: "...", comment: "..." },
    { filePath: "...", line: 25, severity: "CRITICAL", category: "...", comment: "...", suggestion: "..." }
  ]
)
```
