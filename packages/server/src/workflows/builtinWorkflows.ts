/**
 * Built-in Workflow Definitions
 *
 * These are pre-configured workflows for common code review scenarios.
 * They are automatically created in the database on first run.
 */

// ============================================================================
// Types
// ============================================================================

export interface BuiltinPromptNode {
  readonly id: string;
  readonly name: string;
  readonly content: string;
  readonly order: number;
}

export interface BuiltinWorkflow {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly nodes: readonly BuiltinPromptNode[];
}

// ============================================================================
// Workflow IDs
// ============================================================================

export const WORKFLOW_IDS = {
  DEFAULT: 'default',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  IDIOMATIC: 'idiomatic',
  FULL_REVIEW: 'full-review',
} as const;

export type WorkflowId = (typeof WORKFLOW_IDS)[keyof typeof WORKFLOW_IDS];

// ============================================================================
// Default Workflow
// ============================================================================

const DEFAULT_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.DEFAULT,
  name: 'Default Workflow',
  description: 'General code review workflow with comprehensive checks',
  nodes: [
    {
      id: 'default-node-1',
      name: 'General Review',
      content: `Review the code changes between {{base_commit}} and {{head_commit}} on branch {{head_branch}}.

Focus on:
1. Code correctness and logic errors
2. Edge cases and error handling
3. Code readability and maintainability
4. Potential bugs or issues

Add actionable comments with appropriate severity (INFO/WARNING/CRITICAL) and category.`,
      order: 0,
    },
  ],
};

// ============================================================================
// Security Audit Workflow
// ============================================================================

const SECURITY_AUDIT_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.SECURITY,
  name: 'Security Audit',
  description: 'Focuses on OWASP Top 10, secrets detection, and authorization checks',
  nodes: [
    {
      id: 'security-node-1',
      name: 'Vulnerability Scan',
      content: `WORKFLOW: SECURITY_AUDIT

Review the code changes between {{base_commit}} and {{head_commit}}.

Focus strictly on:
1. **OWASP Top 10 vulnerabilities** (SQLi, XSS, CSRF, etc.)
2. **Hardcoded secrets/credentials** (API keys, passwords, tokens)
3. **Unsafe data deserialization**
4. **Improper error handling** that leaks stack traces or sensitive info
5. **Missing authorization checks**
6. **Insecure cryptographic practices**
7. **Path traversal vulnerabilities**

Ignore styling, naming conventions, or minor performance issues unless they pose a security risk.

Use severity:
- CRITICAL: Immediate security risk, must be fixed before merge
- WARNING: Potential security concern, should be reviewed
- INFO: Security best practice suggestion`,
      order: 0,
    },
    {
      id: 'security-node-2',
      name: 'Secrets Detection',
      content: `WORKFLOW: SECRETS_DETECTION

Scan the code changes for any hardcoded secrets or sensitive data.

Look for:
1. **API Keys** - AWS, GCP, Azure, Stripe, etc.
2. **Passwords** - Database, service accounts
3. **Tokens** - JWT, OAuth, access tokens
4. **Private Keys** - SSH, SSL certificates
5. **Connection Strings** - Database URLs with credentials
6. **Environment-specific URLs** - Internal/staging endpoints

All findings should be marked as CRITICAL severity.`,
      order: 1,
    },
  ],
};

// ============================================================================
// Performance Optimization Workflow
// ============================================================================

const PERFORMANCE_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.PERFORMANCE,
  name: 'Performance Review',
  description: 'Focuses on algorithmic complexity, memory usage, and I/O efficiency',
  nodes: [
    {
      id: 'performance-node-1',
      name: 'Complexity Analysis',
      content: `WORKFLOW: PERFORMANCE_OPTIMIZATION

Review the code changes between {{base_commit}} and {{head_commit}}.

Focus strictly on:
1. **Algorithmic complexity (Big O)**
   - Identify O(n²) or worse loops
   - Look for unnecessary nested iterations
   - Suggest more efficient data structures

2. **Database/Query Performance**
   - N+1 query problems
   - Missing indexes
   - Inefficient JOINs

3. **Memory Usage**
   - Memory leaks
   - Large object allocations
   - Unnecessary object creation in loops

4. **I/O Operations**
   - Blocking I/O in critical paths
   - Missing caching opportunities
   - Unnecessary network calls

Provide concrete refactoring suggestions for any identified bottlenecks.`,
      order: 0,
    },
    {
      id: 'performance-node-2',
      name: 'Frontend Performance',
      content: `WORKFLOW: FRONTEND_PERFORMANCE

If the changes include frontend code, analyze for:

1. **Unnecessary re-renders** (React/Vue/etc.)
   - Missing useMemo/useCallback
   - Incorrect dependency arrays
   - State updates causing cascading renders

2. **Bundle size impact**
   - Large imports that could be tree-shaken
   - Dynamic imports for code splitting

3. **Asset optimization**
   - Unoptimized images
   - Missing lazy loading

4. **DOM operations**
   - Layout thrashing
   - Expensive CSS selectors

Skip this step if no frontend code is changed.`,
      order: 1,
    },
  ],
};

// ============================================================================
// Idiomatic TypeScript Workflow
// ============================================================================

const IDIOMATIC_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.IDIOMATIC,
  name: 'Idiomatic Review',
  description: 'Focuses on type safety, immutability, readability, and modern TypeScript patterns',
  nodes: [
    {
      id: 'idiomatic-node-1',
      name: 'Type Safety',
      content: `WORKFLOW: IDIOMATIC_TYPESCRIPT

Review the code changes between {{base_commit}} and {{head_commit}}.

Focus on Type Safety:
1. **'any' usage** - Identify and suggest proper types
2. **Loose typing** - Parameters, return types, variables
3. **Generics opportunities** - Where generics would improve reusability
4. **Type assertions** - Unnecessary or unsafe 'as' casts
5. **Null safety** - Proper null/undefined handling
6. **Type narrowing** - Using type guards effectively

Suggest specific type improvements with code examples.`,
      order: 0,
    },
    {
      id: 'idiomatic-node-2',
      name: 'Code Quality',
      content: `WORKFLOW: CODE_QUALITY

Review for code quality and maintainability:

1. **Immutability**
   - Suggest 'const' over 'let' where applicable
   - Recommend 'readonly' for object properties
   - Avoid mutating function parameters

2. **Readability**
   - Variable/function naming clarity
   - Function length (suggest extraction if > 30 lines)
   - Cyclomatic complexity

3. **Modern Syntax**
   - Optional chaining (?.)
   - Nullish coalescing (??)
   - Template literals
   - Destructuring

4. **DRY Violations**
   - Duplicated code that should be extracted
   - Similar patterns that could be unified`,
      order: 1,
    },
  ],
};

// ============================================================================
// Full Review Workflow (Comprehensive)
// ============================================================================

const FULL_REVIEW_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.FULL_REVIEW,
  name: 'Full Review',
  description: 'Comprehensive code review covering security, performance, and code quality',
  nodes: [
    {
      id: 'full-node-1',
      name: 'Security Check',
      content: `STEP 1: SECURITY REVIEW

Review code changes for security issues:
- OWASP Top 10 vulnerabilities
- Hardcoded secrets
- Authorization/authentication issues
- Input validation

Mark security issues as CRITICAL or WARNING.`,
      order: 0,
    },
    {
      id: 'full-node-2',
      name: 'Performance Check',
      content: `STEP 2: PERFORMANCE REVIEW

Review code changes for performance issues:
- Algorithmic complexity
- Database query efficiency
- Memory management
- Caching opportunities

Focus on measurable impact.`,
      order: 1,
    },
    {
      id: 'full-node-3',
      name: 'Code Quality',
      content: `STEP 3: CODE QUALITY REVIEW

Review for code quality:
- Type safety and proper typing
- Code readability and naming
- Error handling
- Test coverage considerations

Provide constructive suggestions.`,
      order: 2,
    },
    {
      id: 'full-node-4',
      name: 'Summary',
      content: `STEP 4: REVIEW SUMMARY

Provide a brief summary of the review:
- Total issues found by severity
- Key areas of concern
- Overall assessment

This is the final step.`,
      order: 3,
    },
  ],
};

// ============================================================================
// Export All Built-in Workflows
// ============================================================================

export const BUILTIN_WORKFLOWS: readonly BuiltinWorkflow[] = [
  DEFAULT_WORKFLOW,
  SECURITY_AUDIT_WORKFLOW,
  PERFORMANCE_WORKFLOW,
  IDIOMATIC_WORKFLOW,
  FULL_REVIEW_WORKFLOW,
];

/**
 * Get a built-in workflow by ID
 */
export function getBuiltinWorkflow(id: string): BuiltinWorkflow | undefined {
  return BUILTIN_WORKFLOWS.find((w) => w.id === id);
}

/**
 * Check if a workflow ID is a built-in workflow
 */
export function isBuiltinWorkflow(id: string): boolean {
  return BUILTIN_WORKFLOWS.some((w) => w.id === id);
}
