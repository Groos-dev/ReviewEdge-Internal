import { z } from 'zod';
import { McpError, McpErrorCodes, ValidationError } from './McpErrors.js';

type LogLevel = 'error' | 'warn' | 'info';

interface ErrorLogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly name: string;
  readonly message: string;
  readonly code?: number;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private readonly logs: ErrorLogEntry[] = [];
  private readonly maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: unknown): McpError {
    const mcpError = this.normalizeError(error);
    this.log('error', mcpError);
    return mcpError;
  }

  handleValidation(error: z.ZodError): ValidationError {
    const validationError = new ValidationError(
      'Validation failed',
      error.errors.map(({ path, message }) => ({
        path: path.join('.'),
        message,
      }))
    );
    this.log('warn', validationError);
    return validationError;
  }

  private normalizeError(error: unknown): McpError {
    if (error instanceof McpError) {
      return error;
    }

    if (error instanceof z.ZodError) {
      return this.handleValidation(error);
    }

    if (error instanceof Error) {
      return new McpError(McpErrorCodes.INTERNAL_ERROR, error.message);
    }

    return new McpError(
      McpErrorCodes.INTERNAL_ERROR,
      typeof error === 'string' ? error : 'An unknown error occurred'
    );
  }

  private log(level: LogLevel, error: McpError): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      name: error.name,
      message: error.message,
      code: error.code,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogSize) {
      this.logs.shift();
    }

    process.stderr.write(
      `[${entry.timestamp}] [${level.toUpperCase()}] ${entry.name}: ${entry.message}\n`
    );
  }
}

export const errorHandler = ErrorHandler.getInstance();
