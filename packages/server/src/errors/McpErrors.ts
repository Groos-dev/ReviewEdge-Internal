export const McpErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  WORKFLOW_NOT_FOUND: -32000,
  VALIDATION_FAILED: -32001,
  REVIEW_FAILED: -32002,
} as const;

export type McpErrorCode = (typeof McpErrorCodes)[keyof typeof McpErrorCodes];

export class McpError extends Error {
  readonly code: McpErrorCode;
  readonly data?: unknown;

  constructor(code: McpErrorCode, message: string, data?: unknown) {
    super(message);
    this.name = 'McpError';
    this.code = code;
    this.data = data;
    Object.setPrototypeOf(this, McpError.prototype);
  }

  toJSON(): { code: McpErrorCode; message: string; data?: unknown } {
    return {
      code: this.code,
      message: this.message,
      ...(this.data !== undefined && { data: this.data }),
    };
  }
}

export class ValidationError extends McpError {
  constructor(message: string, validationErrors?: unknown) {
    super(McpErrorCodes.VALIDATION_FAILED, message, validationErrors);
    this.name = 'ValidationError';
  }
}

export class WorkflowNotFoundError extends McpError {
  constructor(workflowType: string) {
    super(McpErrorCodes.WORKFLOW_NOT_FOUND, `Unknown workflow type: ${workflowType}`);
    this.name = 'WorkflowNotFoundError';
  }
}
