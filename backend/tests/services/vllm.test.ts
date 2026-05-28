import { VllmService, VllmServiceError } from "../../src/services/vllm";
import { ToolOrchestrator } from "../../src/services/toolOrchestrator";
import type { StreamEvent } from "../../src/types";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function mockJsonResponse(data: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    body: null,
  } as unknown as Response);
}

function mockSSEResponse(lines: string[]): Promise<Response> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(line));
      }
      controller.close();
    },
  });
  return Promise.resolve({
    ok: true,
    status: 200,
    body: stream,
    json: () => Promise.reject(new Error("SSE response")),
  } as unknown as Response);
}

describe("VllmService", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("생성자", () => {
    it("기본 설정으로 인스턴스를 생성한다", () => {
      const service = new VllmService();
      expect(service).toBeInstanceOf(VllmService);
    });

    it("baseUrl을 직접 지정하여 인스턴스를 생성한다", () => {
      const service = new VllmService({ baseUrl: "http://localhost:9000" });
      expect(service).toBeInstanceOf(VllmService);
    });

    it("모델 ID를 직접 지정하여 인스턴스를 생성한다", () => {
      const service = new VllmService({
        modelId: "mistralai/Mistral-7B-Instruct-v0.3",
      });
      expect(service).toBeInstanceOf(VllmService);
    });
  });

  describe("chat - 단일 응답", () => {
    it("메시지를 전송하고 응답을 받는다", async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          choices: [
            {
              message: { role: "assistant", content: "안녕하세요! 무엇을 도와드릴까요?" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 15, total_tokens: 25 },
        }),
      );

      const service = new VllmService();
      const response = await service.chat({
        messages: [{ role: "user", content: [{ text: "안녕하세요" }] }],
      });

      expect(response.content).toHaveLength(1);
      expect(response.content[0].text).toBe("안녕하세요! 무엇을 도와드릴까요?");
      expect(response.stopReason).toBe("stop");
      expect(response.usage.inputTokens).toBe(10);
      expect(response.usage.outputTokens).toBe(15);
    });

    it("시스템 프롬프트가 제공되면 포함한다", async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({
          choices: [
            {
              message: { role: "assistant", content: "저는 친절한 AI입니다." },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
        }),
      );

      const service = new VllmService();
      const response = await service.chat({
        messages: [{ role: "user", content: [{ text: "당신은 누구인가요?" }] }],
        systemPrompt: "당신은 친절한 AI 어시스턴트입니다.",
      });

      expect(response.content[0].text).toBe("저는 친절한 AI입니다.");

      const requestBody = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      );
      expect(requestBody.messages[0].role).toBe("system");
      expect(requestBody.messages[0].content).toBe(
        "당신은 친절한 AI 어시스턴트입니다.",
      );
    });

    it("API 호출 실패 시 에러를 던진다", async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({ error: { message: "API Error" } }, 500),
      );

      const service = new VllmService();

      await expect(
        service.chat({
          messages: [{ role: "user", content: [{ text: "안녕" }] }],
        }),
      ).rejects.toThrow("API Error");
    });
  });

  describe("chatStream - 스트리밍 응답", () => {
    it("텍스트 응답을 스트리밍한다", async () => {
      const sseLines = [
        'data: {"choices":[{"delta":{"role":"assistant","content":""},"finish_reason":null}]}\n',
        '\n',
        'data: {"choices":[{"delta":{"content":"안녕"},"finish_reason":null}]}\n',
        '\n',
        'data: {"choices":[{"delta":{"content":"하세요"},"finish_reason":null}]}\n',
        '\n',
        'data: {"choices":[{"delta":{"content":"!"},"finish_reason":null}]}\n',
        '\n',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}\n',
        '\n',
        'data: [DONE]\n',
        '\n',
      ];

      mockFetch.mockReturnValue(mockSSEResponse(sseLines));

      const service = new VllmService();
      const events: StreamEvent[] = [];

      for await (const event of service.chatStream({
        messages: [{ role: "user", content: [{ text: "안녕" }] }],
      })) {
        events.push(event);
      }

      const textEvents = events.filter((e) => e.type === "text_delta");
      expect(textEvents).toHaveLength(3);
      expect(textEvents[0].text).toBe("안녕");
      expect(textEvents[1].text).toBe("하세요");
      expect(textEvents[2].text).toBe("!");

      const completeEvent = events.find((e) => e.type === "message_complete");
      expect(completeEvent).toBeDefined();
      expect(completeEvent?.usage?.inputTokens).toBe(10);
      expect(completeEvent?.usage?.outputTokens).toBe(5);
    });
  });

  describe("chatStream tool use 처리", () => {
    it("스트리밍에서 tool use 이벤트를 처리한다", async () => {
      const mockTool = {
        definition: {
          type: "function" as const,
          function: {
            name: "get_current_time",
            description: "현재 시간 조회",
            parameters: { type: "object" as const, properties: {} },
          },
        },
        execute: async () => "2026-02-23 15:30:00",
      };
      const orchestrator = new ToolOrchestrator([mockTool]);

      const sseLines1 = [
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"t1","type":"function","function":{"name":"get_current_time","arguments":""}}]},"finish_reason":null}]}\n',
        '\n',
        'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\\"timezone\\":\\"Asia/Seoul\\"}"}}]},"finish_reason":null}]}\n',
        '\n',
        'data: {"choices":[{"delta":{},"finish_reason":"tool_calls"}]}\n',
        '\n',
        'data: [DONE]\n',
        '\n',
      ];

      const sseLines2 = [
        'data: {"choices":[{"delta":{"content":"현재 시간은 15:30입니다."},"finish_reason":null}]}\n',
        '\n',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":20,"completion_tokens":10,"total_tokens":30}}\n',
        '\n',
        'data: [DONE]\n',
        '\n',
      ];

      mockFetch
        .mockReturnValueOnce(mockSSEResponse(sseLines1))
        .mockReturnValueOnce(mockSSEResponse(sseLines2));

      const service = new VllmService();
      service.setToolOrchestrator(orchestrator);
      const events: StreamEvent[] = [];

      for await (const event of service.chatStream({
        messages: [{ role: "user", content: [{ text: "지금 몇 시야?" }] }],
      })) {
        events.push(event);
      }

      const toolStartEvent = events.find((e) => e.type === "tool_use_start");
      expect(toolStartEvent).toBeDefined();
      expect(toolStartEvent?.toolName).toBe("get_current_time");

      const toolResultEvent = events.find((e) => e.type === "tool_result");
      expect(toolResultEvent).toBeDefined();
      expect(toolResultEvent?.toolResult).toBe("2026-02-23 15:30:00");

      const textEvents = events.filter((e) => e.type === "text_delta");
      expect(textEvents).toHaveLength(1);
      expect(textEvents[0].text).toBe("현재 시간은 15:30입니다.");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("orchestrator가 설정되면 tools를 포함한다", async () => {
      const mockTool = {
        definition: {
          type: "function" as const,
          function: {
            name: "test_tool",
            description: "테스트",
            parameters: { type: "object" as const, properties: {} },
          },
        },
        execute: async () => "result",
      };
      const orchestrator = new ToolOrchestrator([mockTool]);

      const sseLines = [
        'data: {"choices":[{"delta":{"content":"응답"},"finish_reason":null}]}\n',
        '\n',
        'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":5,"completion_tokens":3,"total_tokens":8}}\n',
        '\n',
        'data: [DONE]\n',
        '\n',
      ];

      mockFetch.mockReturnValue(mockSSEResponse(sseLines));

      const service = new VllmService();
      service.setToolOrchestrator(orchestrator);

      const events: StreamEvent[] = [];
      for await (const event of service.chatStream({
        messages: [{ role: "user", content: [{ text: "안녕" }] }],
      })) {
        events.push(event);
      }

      const requestBody = JSON.parse(
        (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string,
      );
      expect(requestBody.tools).toBeDefined();
      expect(requestBody.tools).toHaveLength(1);
      expect(requestBody.tools[0].function.name).toBe("test_tool");
    });
  });

  describe("에러 처리", () => {
    it("401 인증 에러를 처리한다", async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse(
          { error: { message: "Incorrect API key provided" } },
          401,
        ),
      );

      const service = new VllmService();

      await expect(
        service.chat({
          messages: [{ role: "user", content: [{ text: "안녕" }] }],
        }),
      ).rejects.toThrow("ACCESS_DENIED");
    });

    it("404 모델을 찾을 수 없는 에러를 처리한다", async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse(
          { error: { message: "The model does not exist" } },
          404,
        ),
      );

      const service = new VllmService();

      await expect(
        service.chat({
          messages: [{ role: "user", content: [{ text: "안녕" }] }],
        }),
      ).rejects.toThrow("MODEL_NOT_FOUND");
    });

    it("429 레이트 리밋 에러를 재시도 가능으로 처리한다", async () => {
      mockFetch.mockReturnValue(
        mockJsonResponse({ error: { message: "Rate limit exceeded" } }, 429),
      );

      const service = new VllmService();

      try {
        await service.chat({
          messages: [{ role: "user", content: [{ text: "안녕" }] }],
        });
      } catch (error) {
        expect(error).toBeInstanceOf(VllmServiceError);
        expect((error as VllmServiceError).retryable).toBe(true);
      }
    });
  });
});
