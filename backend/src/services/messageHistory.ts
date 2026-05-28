import { Message, MessageHistoryOptions } from "../types";

export class MessageHistory {
  private store: Map<string, Message[]> = new Map();
  private options: MessageHistoryOptions;

  constructor(options: MessageHistoryOptions = {}) {
    this.options = options;
  }

  add(sessionId: string, message: Message): void {
    if (!this.store.has(sessionId)) {
      this.store.set(sessionId, []);
    }
    this.store.get(sessionId)!.push(message);
    this.trim(sessionId);
  }

  get(sessionId: string): Message[] {
    return this.store.get(sessionId) ?? [];
  }

  getWithLimit(sessionId: string, limit: number): Message[] {
    const messages = this.store.get(sessionId) ?? [];
    return messages.slice(-limit);
  }

  clear(sessionId: string): void {
    this.store.set(sessionId, []);
  }

  delete(sessionId: string): boolean {
    return this.store.delete(sessionId);
  }

  private trim(sessionId: string): void {
    const { maxMessages } = this.options;
    if (!maxMessages) return;

    const messages = this.store.get(sessionId)!;
    while (messages.length > maxMessages) {
      if (messages[0]?.role === "user" && messages[1]?.role === "assistant") {
        messages.splice(0, 2);
      } else {
        messages.splice(0, 1);
      }
    }
  }
}

export const messageHistory = new MessageHistory();
