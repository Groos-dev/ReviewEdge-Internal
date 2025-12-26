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
  // Java-specific workflows
  JAVA_CODE_STYLE: 'java-code-style',
  JAVA_CONCURRENCY: 'java-concurrency',
  JAVA_RESOURCE: 'java-resource',
  JAVA_FULL_REVIEW: 'java-full-review',
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
// Java Code Style Workflow
// ============================================================================

const JAVA_CODE_STYLE_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.JAVA_CODE_STYLE,
  name: 'Java Code Style',
  description:
    'Java code style review following Google Java Style Guide and Alibaba Java Coding Guidelines',
  nodes: [
    {
      id: 'java-style-node-1',
      name: 'Naming & Structure',
      content: `Review the Java code changes for naming conventions and code structure.

**Naming Conventions (Google/Alibaba Guidelines):**
- Class names: UpperCamelCase (e.g., UserService, OrderProcessor)
- Method names: lowerCamelCase, verb-first (e.g., getUserById, processOrder)
- Constants: UPPER_SNAKE_CASE (e.g., MAX_RETRY_COUNT, DEFAULT_TIMEOUT)
- Variables: lowerCamelCase, meaningful names (avoid single letters except loops)
- Package names: all lowercase, no underscores

**Code Structure:**
- Method length: flag methods > 80 lines
- Class length: flag classes > 500 lines (suggest extraction)
- Parameter count: flag methods with > 5 parameters (suggest object encapsulation)
- Nesting depth: flag code with > 3 levels of nesting

**Import Organization:**
- No wildcard imports (import java.util.* is discouraged)
- Unused imports should be removed
- Static imports should be used sparingly

Use severity:
- WARNING: Style violations that reduce readability
- INFO: Minor suggestions for improvement`,
      order: 0,
    },
    {
      id: 'java-style-node-2',
      name: 'Code Clarity',
      content: `Review the Java code changes for clarity and maintainability.

**Comments & Documentation:**
- Public APIs should have Javadoc with @param, @return, @throws
- Complex logic should have inline comments explaining "why", not "what"
- TODO/FIXME comments should reference issue tracker if available

**Code Clarity:**
- Magic numbers should be constants with meaningful names
- Boolean parameters: consider using enum or builder pattern
- Long method chains: ensure readability, consider intermediate variables
- Conditional complexity: use early returns to reduce nesting

**Modern Java Idioms (Java 8+):**
- Use Optional instead of returning null for absent values
- Prefer Stream API for collection transformations when readable
- Use try-with-resources for AutoCloseable resources
- Use diamond operator (<>) where type inference applies

**Avoid Anti-patterns:**
- God classes that do too much
- Utility classes that should be refactored
- Excessive use of static methods

**Utility Class Creation (DRY Principle):**
When you see new utility class/method being created:
1. Search the codebase first: Does a similar utility already exist?
2. If exists → Use the existing one, do not duplicate
3. If not exists → Check if open-source libraries already provide it (e.g., Apache Commons, Guava, Spring Utils)
4. Only create new utility if no existing solution fits

Flag as WARNING if duplicating existing functionality.`,
      order: 1,
    },
  ],
};

// ============================================================================
// Java Concurrency Workflow
// ============================================================================

const JAVA_CONCURRENCY_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.JAVA_CONCURRENCY,
  name: 'Java Concurrency',
  description: 'Thread safety and concurrency review for Java code',
  nodes: [
    {
      id: 'java-concurrency-node-1',
      name: 'Thread Safety',
      content: `Review the Java code changes for thread safety issues.

**Shared Mutable State:**
- Identify fields that may be accessed by multiple threads
- Check if mutable shared state is properly synchronized
- Flag non-thread-safe collections used in concurrent context (HashMap, ArrayList, etc.)
- Suggest concurrent alternatives: ConcurrentHashMap, CopyOnWriteArrayList, etc.

**Synchronization:**
- Check for proper use of synchronized blocks/methods
- Identify potential deadlocks (lock ordering issues)
- Flag oversynchronization that may cause performance issues
- Check visibility: volatile for simple flags, proper synchronization for compound actions

**Atomic Operations:**
- Check-then-act patterns without synchronization
- Read-modify-write patterns on shared variables
- Suggest AtomicInteger, AtomicReference, AtomicBoolean where appropriate

**Common Pitfalls:**
- Double-checked locking without volatile
- Lazy initialization race conditions
- Publishing objects before fully constructed

Use severity:
- CRITICAL: Race conditions, deadlock potential
- WARNING: Missing synchronization on shared state
- INFO: Thread-safety improvement suggestions`,
      order: 0,
    },
    {
      id: 'java-concurrency-node-2',
      name: 'Executor & Async',
      content: `Review the Java code changes for executor and async patterns.

**Thread Pool Usage:**
- Direct Thread creation: suggest using ExecutorService instead
- Unbounded thread pools (newCachedThreadPool): ensure appropriate for use case
- Fixed thread pools: check if size is configurable/appropriate
- Custom ThreadFactory: ensure proper naming for debugging

**Task Submission:**
- Check for proper exception handling in submitted tasks
- Future.get() without timeout: potential indefinite blocking
- Proper shutdown of ExecutorService (shutdown + awaitTermination)

**CompletableFuture (Java 8+):**
- Exception handling with exceptionally() or handle()
- Avoid blocking calls (join/get) in async pipelines
- Check for proper executor specification (avoid ForkJoinPool.commonPool for I/O)

**Resource Cleanup:**
- Ensure ExecutorService is properly shut down
- Check for thread leaks in error paths
- Verify cleanup in finally blocks or try-with-resources`,
      order: 1,
    },
  ],
};

// ============================================================================
// Java Resource Management Workflow
// ============================================================================

const JAVA_RESOURCE_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.JAVA_RESOURCE,
  name: 'Java Resource Management',
  description: 'Resource handling, memory management, and leak prevention for Java code',
  nodes: [
    {
      id: 'java-resource-node-1',
      name: 'Resource Leaks',
      content: `Review the Java code changes for resource leak issues.

**AutoCloseable Resources:**
- Streams, Readers, Writers must be closed (prefer try-with-resources)
- JDBC: Connection, Statement, ResultSet must be closed
- Network: Socket, ServerSocket, HttpURLConnection must be closed
- Check for close() in finally blocks or try-with-resources

**Common Leak Patterns:**
- Resources opened but not closed in error paths
- Resources stored in fields without clear lifecycle management
- Nested resources: ensure inner resources are also closed
- Streams from Files.lines(), Files.list() must be closed

**Try-with-Resources Best Practice:**
\`\`\`java
// Good
try (var stream = Files.lines(path)) {
    stream.forEach(System.out::println);
}

// Bad - potential leak
Stream<String> stream = Files.lines(path);
stream.forEach(System.out::println);
\`\`\`

Use severity:
- CRITICAL: Clear resource leak in production code path
- WARNING: Potential leak in error handling paths
- INFO: Suggestion to modernize to try-with-resources`,
      order: 0,
    },
    {
      id: 'java-resource-node-2',
      name: 'Memory Efficiency',
      content: `Review the Java code changes for memory efficiency.

**Object Creation:**
- Unnecessary object creation in loops (move to outside loop)
- String concatenation in loops: use StringBuilder
- Autoboxing in tight loops: prefer primitives
- Defensive copies: ensure necessary but avoid excessive copying

**Collection Sizing:**
- ArrayList/HashMap without initial capacity when size is known
- Growing collections in loops: pre-size when possible
- Large collections: consider lazy loading or pagination

**String Handling:**
- String.intern() usage: ensure it's intentional and beneficial
- Substring memory retention (pre-Java 7u6)
- Large string building: use StringBuilder with capacity

**Memory Leak Patterns:**
- Static collections that grow without bounds
- Listeners/callbacks not removed after use
- Inner classes holding references to outer class
- ThreadLocal not removed after use

**Caching Considerations:**
- Unbounded caches without eviction policy
- WeakReference/SoftReference usage for caches
- Cache key objects: proper equals/hashCode`,
      order: 1,
    },
  ],
};

// ============================================================================
// Java Full Review Workflow
// ============================================================================

const JAVA_FULL_REVIEW_WORKFLOW: BuiltinWorkflow = {
  id: WORKFLOW_IDS.JAVA_FULL_REVIEW,
  name: 'Java Full Review',
  description:
    'Comprehensive Java code review covering style, concurrency, resources, and exceptions',
  nodes: [
    {
      id: 'java-full-node-1',
      name: 'Code Style & Naming',
      content: `STEP 1: JAVA CODE STYLE

Review Java code for style and naming conventions:

**Check:**
- Class/method/variable naming follows conventions
- Method length and complexity reasonable
- No magic numbers (use constants)
- Proper Javadoc on public APIs
- No wildcard or unused imports

Severity: Use INFO for style suggestions, WARNING for significant violations.`,
      order: 0,
    },
    {
      id: 'java-full-node-2',
      name: 'Thread Safety',
      content: `STEP 2: THREAD SAFETY

Review Java code for concurrency issues:

**Check:**
- Shared mutable state is synchronized
- Thread-safe collections used in concurrent context
- No race conditions in check-then-act patterns
- Proper visibility (volatile, synchronized)
- ExecutorService properly managed

Severity: CRITICAL for race conditions, WARNING for potential issues.`,
      order: 1,
    },
    {
      id: 'java-full-node-3',
      name: 'Resource Management',
      content: `STEP 3: RESOURCE MANAGEMENT

Review Java code for resource handling:

**Check:**
- All AutoCloseable resources use try-with-resources
- No resource leaks in error paths
- JDBC/IO/Network resources properly closed
- No unbounded collections/caches

Severity: CRITICAL for clear leaks, WARNING for potential issues.`,
      order: 2,
    },
    {
      id: 'java-full-node-4',
      name: 'Exception Handling',
      content: `STEP 4: EXCEPTION HANDLING

Review Java code for exception handling:

**Check:**
- No empty catch blocks (at minimum log the exception)
- No catching generic Exception/Throwable (be specific)
- Exceptions not used for flow control
- Checked exceptions properly documented with @throws
- Resources cleaned up in finally or try-with-resources

**Good pattern:**
\`\`\`java
try {
    // operation
} catch (SpecificException e) {
    logger.error("Context message", e);
    throw new BusinessException("User-friendly message", e);
}
\`\`\`

Severity: WARNING for poor exception handling patterns.`,
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
  // Java-specific workflows
  JAVA_CODE_STYLE_WORKFLOW,
  JAVA_CONCURRENCY_WORKFLOW,
  JAVA_RESOURCE_WORKFLOW,
  JAVA_FULL_REVIEW_WORKFLOW,
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
