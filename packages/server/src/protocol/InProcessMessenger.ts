/**
 * In-process messenger for VSCode Extension
 * Messages are passed directly within the same process
 */

import type { Message, Response } from './types.js';

export type { Message, Response };

type MessageHandler<T = unknown> = (message: Message<T>) => Promise<unknown> | unknown;

export class InProcessMessenger<ToProtocol, FromProtocol> {
  private typeListeners = new Map<string, Set<MessageHandler>>();
  private idListeners = new Map<string, (message: Message) => void>();
  private onErrorHandlers: Array<(message: Message, error: Error) => void> = [];

  // TODO(reliability): Add request timeouts and cancellation (AbortSignal) support.
  //   Today, a stuck handler can leave requests pending and leak entries in idListeners.

  /**
   * Register a handler for a specific message type
   */
  on<K extends keyof ToProtocol & keyof FromProtocol>(
    messageType: K,
    handler: (message: Message<ToProtocol[K]>) => Promise<FromProtocol[K]> | FromProtocol[K]
  ): void {
    const key = messageType as string;
    if (!this.typeListeners.has(key)) {
      this.typeListeners.set(key, new Set());
    }
    const listeners = this.typeListeners.get(key);
    if (listeners) {
      listeners.add(handler as MessageHandler);
    }
  }

  /**
   * Send a message and wait for response
   */
  async request<K extends keyof ToProtocol & keyof FromProtocol>(
    messageType: K,
    data: ToProtocol[K],
    messageId?: string
  ): Promise<FromProtocol[K]> {
    const id = messageId || this.generateMessageId();
    const message: Message<ToProtocol[K]> = {
      messageType: messageType as string,
      messageId: id,
      data,
    };

    return new Promise((resolve, reject) => {
      this.idListeners.set(id, (response: Message) => {
        this.idListeners.delete(id);
        const resp = response.data as Response<FromProtocol[K]>;
        if (resp.status === 'error') {
          reject(new Error(resp.error || 'Unknown error'));
        } else {
          resolve(resp.content as FromProtocol[K]);
        }
      });

      this.handleMessage(message).catch((error) => {
        this.idListeners.delete(id);
        reject(error);
      });
    });
  }

  /**
   * Send a message without waiting for response
   */
  send<K extends keyof ToProtocol>(messageType: K, data: ToProtocol[K], messageId?: string): void {
    const id = messageId || this.generateMessageId();
    const message: Message<ToProtocol[K]> = {
      messageType: messageType as string,
      messageId: id,
      data,
    };
    void this.handleMessage(message);
  }

  /**
   * Handle incoming message
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      const listeners = this.typeListeners.get(message.messageType);
      if (!listeners || listeners.size === 0) {
        this.sendResponse(message.messageId, {
          done: true,
          status: 'error',
          error: `No handler for message type: ${message.messageType}`,
        });
        return;
      }

      // Call all handlers for this message type
      for (const handler of listeners) {
        try {
          const response = await handler(message);
          this.sendResponse(message.messageId, {
            done: true,
            status: 'success',
            content: response,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.sendResponse(message.messageId, {
            done: true,
            status: 'error',
            error: errorMessage,
          });
          this.onErrorHandlers.forEach((handler) => {
            handler(message, error instanceof Error ? error : new Error(String(error)));
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.sendResponse(message.messageId, {
        done: true,
        status: 'error',
        error: errorMessage,
      });
    }
  }

  /**
   * Send response back to requester
   */
  private sendResponse(messageId: string, response: Response): void {
    const listener = this.idListeners.get(messageId);
    if (listener) {
      listener({
        messageType: 'response',
        messageId,
        data: response,
      });
    }
  }

  /**
   * Register error handler
   */
  onError(handler: (message: Message, error: Error) => void): void {
    this.onErrorHandlers.push(handler);
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}
