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

function parseSSEBlock(block: string): SSEEvent | null {
  const lines = block.split("\n").filter((l) => l.trim());
  let type = "text";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event: ")) {
      type = line.slice(7).trim();
    } else if (line.startsWith("data: ")) {
      data = line.slice(6).trim();
    }
  }

  if (!data && type === "text") return null;

  const event: SSEEvent = { type: type as SSEEvent["type"] };

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    if (parsed.text !== undefined) event.content = parsed.text as string;
    if (parsed.toolId !== undefined) event.toolId = parsed.toolId as string;
    if (parsed.toolName !== undefined)
      event.toolName = parsed.toolName as string;
    if (parsed.toolResult !== undefined)
      event.toolResult = parsed.toolResult as string;
    if (parsed.usage !== undefined)
      event.usage = parsed.usage as SSEEvent["usage"];
    if (parsed.error !== undefined) event.error = parsed.error as string;
  } catch {
    // empty or invalid JSON — leave event fields unset
  }

  return event;
}

export async function streamChat(
  sessionId: string,
  message: string,
  callback: SSECallback,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      if (!block.trim()) continue;
      const event = parseSSEBlock(block);
      if (event) callback(event);
    }
  }

  if (buffer.trim()) {
    const event = parseSSEBlock(buffer);
    if (event) callback(event);
  }
}
