import { useState, useEffect, useRef, useCallback } from "react";
import { streamChat } from "../services/sse";
import type { SSEEvent } from "../services/sse";
import type { Message, ToolCall } from "../types";

interface BackendMessage {
  role: string;
  content: { text: string }[];
}

export function useChat(sessionId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // true when sendMessage was called with a brand-new overrideSessionId so the
  // sessionId-change effect should not wipe the in-flight messages.
  const skipClearRef = useRef(false);

  useEffect(() => {
    if (skipClearRef.current) {
      skipClearRef.current = false;
    } else {
      setMessages([]);
      setIsLoading(false);
      setError(null);
    }

    if (!sessionId) return;

    const loadMessages = async () => {
      try {
        const response = await fetch(`/api/sessions/${sessionId}/messages`);
        if (!response.ok) return;
        const data = (await response.json()) as BackendMessage[];
        if (data.length === 0) return;
        setMessages((prev) => {
          if (prev.length > 0) return prev;
          return data.map((m) => ({
            id: crypto.randomUUID(),
            role: m.role as Message["role"],
            content: m.content.map((c) => c.text).join(""),
            timestamp: new Date(),
          }));
        });
      } catch {
        // silently ignore load failures
      }
    };

    loadMessages();
  }, [sessionId]);

  const sendMessage = useCallback(
    async (message: string, overrideSessionId?: string) => {
      const effectiveSessionId = overrideSessionId ?? sessionId;
      if (!effectiveSessionId) return;

      if (overrideSessionId) {
        skipClearRef.current = true;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        toolCalls: [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsLoading(true);
      setError(null);

      try {
        await streamChat(
          effectiveSessionId,
          message,
          (event: SSEEvent) => {
            if (event.type === "text" && event.content !== undefined) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + event.content! },
                ];
              });
            } else if (event.type === "tool_start") {
              const toolId = event.toolId ?? event.toolUseId;
              if (!toolId || !event.toolName) return;
              const toolCall: ToolCall = {
                id: toolId,
                name: event.toolName,
                input: {},
                status: "running",
              };
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    toolCalls: [...(last.toolCalls ?? []), toolCall],
                  },
                ];
              });
            } else if (event.type === "tool_result") {
              const toolId = event.toolId ?? event.toolUseId;
              if (!toolId) return;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                return [
                  ...prev.slice(0, -1),
                  {
                    ...last,
                    toolCalls: last.toolCalls?.map((tc) =>
                      tc.id === toolId
                        ? {
                            ...tc,
                            status: (event.toolStatus === "error"
                              ? "error"
                              : "success") as ToolCall["status"],
                            result: event.toolResult,
                          }
                        : tc,
                    ),
                  },
                ];
              });
            } else if (event.type === "error") {
              setError(event.error ?? "Unknown error");
            }
          },
          controller.signal,
        );
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, error, sendMessage, clearMessages };
}
