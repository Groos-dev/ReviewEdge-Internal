## 🛠️ How to Add Review Comments

### Get Code Changes First
```bash
git diff {{base_commit}} {{head_commit}}
```

### ⚠️ CRITICAL: Line Number Accuracy

**The `line` parameter MUST point to the EXACT line where the issue occurs.**

❌ **WRONG**: Using class/function declaration line for issues inside the body
- Issue in method parameter on line 42 → Using line 1 (class definition)
- Issue in loop body on line 156 → Using line 150 (function definition)

✅ **CORRECT**: Using the precise line where the problem exists
- Issue in method parameter on line 42 → Using line 42
- Issue in loop body on line 156 → Using line 156

**Why this matters**: Comments are rendered at the specified line in VS Code. Inaccurate line numbers make comments appear in wrong locations, confusing developers.

### Adding Comments

**Single Comment:**
```
add_review_comment(
  taskId: "{{task_id}}",
  workspacePath: "{{workspace_path}}",
  filePath: "path/to/file.ts",
  line: 42,  // EXACT line number where the issue occurs
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
    { filePath: "...", line: 42, severity: "WARNING", category: "...", comment: "..." },
    { filePath: "...", line: 156, severity: "CRITICAL", category: "...", comment: "...", suggestion: "..." }
  ]
)
```
