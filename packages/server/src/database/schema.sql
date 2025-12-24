CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS prompt_nodes (
    id TEXT PRIMARY KEY,
    workflowId TEXT NOT NULL,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (workflowId) REFERENCES workflows (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    baseBranch TEXT NOT NULL,
    baseCommit TEXT NOT NULL,
    headBranch TEXT NOT NULL,
    headCommit TEXT NOT NULL,
    workflowId TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS review_comments (
    id TEXT PRIMARY KEY,
    taskId TEXT NOT NULL,
    filePath TEXT NOT NULL,
    line INTEGER NOT NULL,
    severity TEXT NOT NULL DEFAULT 'INFO',
    category TEXT NOT NULL DEFAULT 'Review',
    comment TEXT NOT NULL,
    suggestion TEXT,
    resolved INTEGER DEFAULT 0,
    resolvedAt INTEGER,
    resolvedBy TEXT,
    createdAt INTEGER NOT NULL,
    FOREIGN KEY (taskId) REFERENCES tasks (id) ON DELETE CASCADE
);