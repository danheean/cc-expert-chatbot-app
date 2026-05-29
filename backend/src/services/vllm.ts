import type { ConversationRequest, ConversationResponse, Message, StreamEvent } from "../types";
import { CITY_ALIASES } from "../tools/getWeather";
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
  requestTimeoutMs?: number;
}

const MAX_TOOL_ROUNDTRIPS = 5;
const DEFAULT_REQUEST_TIMEOUT_MS = 60_000;

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

type StreamReadResult = Awaited<
  ReturnType<ReadableStreamDefaultReader<Uint8Array>["read"]>
>;

interface ForcedToolCall {
  toolUseId: string;
  name: string;
  input: Record<string, unknown>;
}

export class VllmService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly requestTimeoutMs: number;
  private toolOrchestrator?: ToolOrchestrator;

  constructor(options: VllmServiceOptions = {}) {
    const envTimeoutMs = Number(process.env.VLLM_REQUEST_TIMEOUT_MS);
    this.baseUrl =
      options.baseUrl ?? process.env.VLLM_BASE_URL ?? "http://localhost:8000";
    this.apiKey = options.apiKey ?? process.env.VLLM_API_KEY ?? "dummy";
    this.modelId =
      options.modelId ??
      process.env.VLLM_MODEL_ID ??
      "meta-llama/Llama-3.1-8B-Instruct";
    this.requestTimeoutMs =
      options.requestTimeoutMs ??
      (Number.isFinite(envTimeoutMs) && envTimeoutMs > 0
        ? envTimeoutMs
        : DEFAULT_REQUEST_TIMEOUT_MS);
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

    const choice = data.choices[0];
    if (!choice) {
      throw new VllmServiceError("Empty response from vLLM", "EMPTY_RESPONSE", true);
    }

    return {
      content: [{ text: choice.message.content ?? "" }],
      stopReason: choice.finish_reason,
      usage: {
        inputTokens: data.usage.prompt_tokens,
        outputTokens: data.usage.completion_tokens,
      },
    };
  }

  async *chatStream(request: ConversationRequest): AsyncGenerator<StreamEvent> {
    const messages = this.buildOpenAIMessages(request);
    const forcedToolCall = this.resolveForcedToolCall(request);

    if (forcedToolCall && this.toolOrchestrator) {
      yield {
        type: "tool_use_start",
        toolUseId: forcedToolCall.toolUseId,
        toolName: forcedToolCall.name,
      };

      const toolResult = await this.toolOrchestrator.executeSingle(forcedToolCall);
      yield {
        type: "tool_result",
        toolUseId: toolResult.toolUseId,
        toolResult: toolResult.content,
        toolStatus: toolResult.status ?? "success",
      };

      yield {
        type: "text_delta",
        text: this.formatForcedToolAnswer(forcedToolCall.name, toolResult.content),
      };
      yield {
        type: "message_complete",
        usage: { inputTokens: 0, outputTokens: 0 },
      };
      return;
    }

    let toolRoundTrips = 0;

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
        const { done, value } = await this.readStreamChunk(reader);
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
                const toolUseId = tc.id ?? `tool-${tc.index}`;
                toolCallMap.set(tc.index, {
                  id: toolUseId,
                  name: tc.function?.name ?? "",
                  args: "",
                });
                if (tc.function?.name) {
                  yield {
                    type: "tool_use_start",
                    toolUseId,
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
        if (toolRoundTrips >= MAX_TOOL_ROUNDTRIPS) {
          throw new VllmServiceError(
            "도구 호출이 너무 반복되어 응답을 중단했습니다.",
            "TOOL_LOOP_LIMIT",
          );
        }
        toolRoundTrips += 1;

        const assistantToolCalls: OpenAIToolCall[] = [];
        const pendingToolCalls: Array<{
          toolUseId: string;
          name: string;
          input: Record<string, unknown>;
        }> = [];

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

          pendingToolCalls.push({
            toolUseId: tc.id,
            name: tc.name,
            input,
          });
        }

        const toolResults = await this.toolOrchestrator.executeMultiple(pendingToolCalls);
        for (const toolResult of toolResults) {
          yield {
            type: "tool_result",
            toolUseId: toolResult.toolUseId,
            toolResult: toolResult.content,
            toolStatus: toolResult.status ?? "success",
          };
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
            tool_call_id: tr.toolUseId,
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

  private resolveForcedToolCall(request: ConversationRequest): ForcedToolCall | undefined {
    const lastUserMessage = [...request.messages].reverse().find((msg) => msg.role === "user");
    if (!lastUserMessage) return undefined;

    const text = this.extractText(lastUserMessage);
    const weatherCity = this.extractWeatherCity(text);
    if (weatherCity) {
      return {
        toolUseId: "forced-get-weather",
        name: "get_weather",
        input: { city: weatherCity },
      };
    }

    if (this.isCurrentTimeRequest(text)) {
      return {
        toolUseId: "forced-get-current-time",
        name: "get_current_time",
        input: { timezone: "Asia/Seoul" },
      };
    }

    const expression = this.extractCalculationExpression(text);
    if (expression) {
      return {
        toolUseId: "forced-calculator",
        name: "calculator",
        input: { expression },
      };
    }

    return undefined;
  }

  private isCurrentTimeRequest(text: string): boolean {
    return (
      text.includes("get_current_time") ||
      text.includes("Asia/Seoul") ||
      /(?:현재|오늘|지금).*(?:날짜|시간)/.test(text) ||
      /(?:날짜|시간).*(?:현재|오늘|지금)/.test(text)
    );
  }

  private extractWeatherCity(text: string): string | undefined {
    if (!text.includes("get_weather") && !text.includes("날씨")) return undefined;

    for (const [source, city] of Object.entries(CITY_ALIASES)) {
      if (text.includes(source) || text.toLowerCase().includes(city.toLowerCase())) {
        return city;
      }
    }

    return undefined;
  }

  private extractCalculationExpression(text: string): string | undefined {
    if (!text.includes("계산") && !text.includes("calculator")) return undefined;
    const expression = text.match(/[0-9+\-*/^().\s]+/)?.[0]?.trim();
    return expression || undefined;
  }

  private formatForcedToolAnswer(toolName: string, toolResult: string): string {
    if (toolName === "get_current_time") {
      return `도구 결과 기준 현재 날짜와 시간은 ${toolResult}입니다.`;
    }
    if (toolName === "get_weather") {
      return `도구 결과 기준 현재 날씨는 ${toolResult}입니다.`;
    }
    if (toolName === "calculator") {
      return `도구 결과 기준 계산 결과는 ${toolResult}입니다.`;
    }
    return toolResult;
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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error && error.name === "AbortError") {
        throw new VllmServiceError("VLLM_TIMEOUT", "VLLM_TIMEOUT", true);
      }
      throw error;
    }
    clearTimeout(timeout);

    if (!response.ok) {
      await this.throwHttpError(response);
    }

    return response;
  }

  private async readStreamChunk(
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): Promise<StreamReadResult> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        reader.read(),
        new Promise<StreamReadResult>((_, reject) => {
          timeout = setTimeout(
            () => reject(new VllmServiceError("VLLM_TIMEOUT", "VLLM_TIMEOUT", true)),
            this.requestTimeoutMs,
          );
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
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
