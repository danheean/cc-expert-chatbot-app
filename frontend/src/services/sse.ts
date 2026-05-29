export interface SSEEvent {
  type: "text" | "tool_start" | "tool_result" | "done" | "error";
  content?: string;
  toolId?: string;
  toolName?: string;
  toolResult?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  error?: string;
}
export type SSECallback = (event: SSEEvent) => void;
    