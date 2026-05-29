import type { ConversationRequest, ConversationResponse, Message, StreamEvent } from "../types";
import type { ToolOrchestrator } from "./toolOrchestrator";

export class VllmServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "VllmServiceError";
  }
}

interface VllmServiceOptions {
  baseUrl?: string;
  apiKey?: string;
  modelId?: string;
}

interface OpenAIMessage {
  role: string;
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export class VllmService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly modelId: string;
  private toolOrchestrator?: ToolOrchestrator;

  constructor(options: VllmServiceOptions = {}) {
    this.baseUrl =
      options.baseUrl ?? process.env.VLLM_BASE_URL ?? "http://localhost:8000";
    this.apiKey = options.apiKey ?? process.env.VLLM_API_KEY ?? "dummy";
    this.modelId =
      options.modelId ??
      process.env.VLLM_MODEL_ID ??
      "meta-llama/Llama-3.1-8B-Instruct";
  }

  setToolOrchestrator(orchestrator: ToolOrchestrator): void {
    this.toolOrchestrator = orchestrator;
  }

  async chat(request: ConversationRequest): Promise<ConversationResponse> {
    const messages = this.buildOpenAIMessages(request);
    const body = this.buildBody(messages, false);
    const response = await this.fetchCompletion(body);

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: [{ text: data.choices[0].message.content ?? "" }],
      stopReason: data.choices[0].finish_reason,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
    };
  }

  async *chatStream(request: ConversationRequest): AsyncGenerator<StreamEvent> {
    const messages = this.buildOpenAIMessages(request);

    while (true) {
      const body = this.buildBody(messages, true);
      const response = await this.fetchCompletion(body);
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finishReason: string | null = null;
      let usage: { inputTokens: number; outputTokens: number } | undefined;
      const toolCallMap = new Map<
        number,
        { id: string; name: string; args: string }
      >();

      loop: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break loop;

          let chunk: {
            choices?: Array<{
              delta?: {
                content?: string;
                tool_calls?: Array<{
                  index: number;
                  id?: string;
                  function?: { name?: string; arguments?: string };
                }>;
              };
              finish_reason?: string | null;
            }>;
            usage?: { prompt_tokens: number; completion_tokens: number };
          };
          try {
            chunk = JSON.parse(raw) as typeof chunk;
          } catch {
            continue;
          }

          if (chunk.usage) {
            usage = {
              inputTokens: chunk.usage.prompt_tokens,
              outputTokens: chunk.usage.completion_tokens,
            };
          }

          const choice = chunk.choices?.[0];
          if (!choice) continue;

          if (choice.finish_reason) finishReason = choice.finish_reason;

          const delta = choice.delta;
          if (!delta) continue;

          if (delta.content) {
            yield { type: "text_delta", text: delta.content };
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (!toolCallMap.has(tc.index)) {
                toolCallMap.set(tc.index, {
                  id: tc.id ?? "",
                  name: tc.function?.name ?? "",
                  args: "",
                });
                if (tc.function?.name) {
                  yield {
                    type: "tool_use_start",
                    toolUseId: tc.id,
                    toolName: tc.function.name,
                  };
                }
              }
              if (tc.function?.arguments) {
                toolCallMap.get(tc.index)!.args += tc.function.arguments;
              }
            }
          }
        }
      }

      if (finishReason === "tool_calls" && this.toolOrchestrator) {
        const assistantToolCalls: OpenAIToolCall[] = [];
        const toolResults: Array<{ id: string; content: string }> = [];

        for (const [, tc] of toolCallMap) {
          assistantToolCalls.push({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: tc.args },
          });

          let input: Record<string, unknown>;
          try {
            input = JSON.parse(tc.args || "{}") as Record<string, unknown>;
          } catch {
            input = {};
          }

          const toolResult = await this.toolOrchestrator.executeSingle({
            toolUseId: tc.id,
            name: tc.name,
            input,
          });
          yield { type: "tool_result", toolResult: toolResult.content };
          toolResults.push({ id: tc.id, content: toolResult.content });
        }

        // Add assistant message with all tool calls (once, outside the loop)
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: assistantToolCalls,
        });

        // Add each tool result message
        for (const tr of toolResults) {
          messages.push({
            role: "tool",
            content: tr.content,
            tool_call_id: tr.id,
          });
        }

        continue;
      }

      yield {
        type: "message_complete",
        usage: usage ?? { inputTokens: 0, outputTokens: 0 },
      };
      break;
    }
  }

  private buildOpenAIMessages(request: ConversationRequest): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }

    for (const msg of request.messages) {
      messages.push({
        role: msg.role,
        content: this.extractText(msg),
      });
    }

    return messages;
  }

  private extractText(msg: Message): string {
    return msg.content
      .filter((b) => b.text !== undefined)
      .map((b) => b.text!)
      .join("");
  }

  private buildBody(
    messages: OpenAIMessage[],
    stream: boolean,
  ): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages,
      stream,
      max_tokens: 1024,
      temperature: 0.7,
    };

    if (stream) {
      body.stream_options = { include_usage: true };
    }

    if (this.toolOrchestrator) {
      body.tools = this.toolOrchestrator.getToolDefinitions().map((def) => ({
        type: "function",
        function: {
          name: def.toolSpec.name,
          description: def.toolSpec.description,
          parameters: def.toolSpec.inputSchema.json,
        },
      }));
      body.tool_choice = "auto";
    }

    return body;
  }

  private async fetchCompletion(body: Record<string, unknown>): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await this.throwHttpError(response);
    }

    return response;
  }

  private async throwHttpError(response: Response): Promise<never> {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as {
        error?: { message?: string };
      };
      message = body.error?.message ?? message;
    } catch {
      // ignore parse error
    }

    if (response.status === 401) {
      throw new VllmServiceError("ACCESS_DENIED", "ACCESS_DENIED");
    } else if (response.status === 404) {
      throw new VllmServiceError("MODEL_NOT_FOUND", "MODEL_NOT_FOUND");
    } else if (response.status === 429) {
      throw new VllmServiceError("RATE_LIMITED", "RATE_LIMITED", true);
    } else {
      throw new VllmServiceError(message, "API_ERROR");
    }
  }
}
