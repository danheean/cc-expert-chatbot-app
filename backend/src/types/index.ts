// src/types/index.ts

export interface Message {
  role: "user" | "assistant";
  content: ContentBlock[];
}

export interface ContentBlock {
  text?: string;
  toolUse?: ToolUseBlock;
  toolResult?: ToolResultBlock;
}

export interface ToolUseBlock {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  toolUseId: string;
  content: string;
}

export interface ConversationRequest {
  messages: Message[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface ConversationResponse {
  content: ContentBlock[];
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface StreamEvent {
  type:
    | "text_delta"
    | "tool_use_start"
    | "tool_use_delta"
    | "tool_result"
    | "message_complete"
    | "error";
  text?: string;
  toolUseId?: string;
  toolName?: string;
  toolInput?: string;
  toolResult?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}

export interface Session {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionRequest {
  id?: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateSessionRequest {
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageHistoryOptions {
  maxMessages?: number;
  maxTokens?: number;
}
