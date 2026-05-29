import { VllmService } from "../../src/services/vllm";
import { ToolOrchestrator } from "../../src/services/toolOrchestrator";
import type { Tool } from "../../src/types/tool";
import { getCurrentTimeTool } from "../../src/tools/getCurrentTime";

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Builds a fake Response whose body streams the given SSE lines
function createSSEResponse(chunks: object[], text?: string): unknown {
	const lines: string[] = [];

	for (const chunk of chunks) {
		lines.push(`data: ${JSON.stringify(chunk)}`);
	}
	if (text !== undefined) {
		lines.push(
			`data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: null }] })}`,
		);
	}
	lines.push("data: [DONE]");

	const sseData = lines.join("\n") + "\n";
	const encoder = new TextEncoder();
	let sent = false;

	return {
		ok: true,
		body: {
			getReader() {
				return {
					async read() {
						if (!sent) {
							sent = true;
							return { done: false, value: encoder.encode(sseData) };
						}
						return { done: true, value: new Uint8Array(0) };
					},
					releaseLock() {},
				};
			},
		},
	};
}

function toolUseSSE(toolUseId: string, name: string, args: string): object[] {
	return [
		{
			choices: [
				{
					delta: {
						tool_calls: [
							{ index: 0, id: toolUseId, function: { name, arguments: "" } },
						],
					},
					finish_reason: null,
				},
			],
		},
		{
			choices: [
				{
					delta: { tool_calls: [{ index: 0, function: { arguments: args } }] },
					finish_reason: null,
				},
			],
		},
		{
			choices: [{ delta: {}, finish_reason: "tool_calls" }],
			usage: { prompt_tokens: 10, completion_tokens: 5 },
		},
	];
}

function textSSE(text: string): object[] {
	return [
		{ choices: [{ delta: { content: text }, finish_reason: null }] },
		{
			choices: [{ delta: {}, finish_reason: "stop" }],
			usage: { prompt_tokens: 15, completion_tokens: 10 },
		},
	];
}

describe("VllmService - Tool Use 통합", () => {
	let service: VllmService;
	let orchestrator: ToolOrchestrator;

	beforeEach(() => {
		mockFetch.mockReset();
		const mockTool = {
			definition: {
				toolSpec: {
					name: "test_tool",
					description: "Test tool",
					inputSchema: { json: { type: "object" as const, properties: {} } },
				},
			},
			execute: async () => "mock result",
		};
		orchestrator = new ToolOrchestrator([mockTool]);
		service = new VllmService();
		service.setToolOrchestrator(orchestrator);
	});

	it("stopReason이 tool_use이면 도구를 실행하고 재전송한다", async () => {
		// 첫 번째 응답: tool_use, 두 번째 응답: end_turn
		mockFetch
			.mockResolvedValueOnce(createSSEResponse(toolUseSSE("t1", "test_tool", "{}")))
			.mockResolvedValueOnce(createSSEResponse(textSSE("최종 응답")));

		const events: unknown[] = [];
		for await (const event of service.chatStream({
			messages: [{ role: "user", content: [{ text: "테스트" }] }],
		})) {
			events.push(event);
		}

		// tool_use_start 이벤트가 있어야 한다
		const toolStart = events.find((e) => (e as { type: string }).type === "tool_use_start");
		expect(toolStart).toBeDefined();

		// tool_result 이벤트가 있어야 한다
		const toolResult = events.find((e) => (e as { type: string }).type === "tool_result");
		expect(toolResult).toBeDefined();

		// 최종 텍스트 이벤트가 있어야 한다
		const textEvent = events.find((e) => (e as { type: string }).type === "text_delta");
		expect((textEvent as { text?: string })?.text).toBe("최종 응답");

		// fetch API가 2번 호출되어야 함 (tool_use -> end_turn)
		expect(mockFetch).toHaveBeenCalledTimes(2);
	});

	it("stopReason이 end_turn이면 루프를 종료한다", async () => {
		mockFetch.mockResolvedValueOnce(createSSEResponse(textSSE("바로 응답")));

		const events: unknown[] = [];
		for await (const event of service.chatStream({
			messages: [{ role: "user", content: [{ text: "안녕" }] }],
		})) {
			events.push(event);
		}

		expect(mockFetch).toHaveBeenCalledTimes(1);
		const textEvent = events.find((e) => (e as { type: string }).type === "text_delta");
		expect((textEvent as { text?: string })?.text).toBe("바로 응답");
	});

	describe.each([
		{
			name: "get_current_time",
			args: '{"timezone":"Asia/Seoul"}',
			result: "2026-01-15 10:30:00 Asia/Seoul",
		},
		{
			name: "get_weather",
			args: '{"city":"Seoul"}',
			result: "Seoul, South Korea: 맑음, 기온 15°C, 습도 40%, 풍속 3 km/h",
		},
		{
			name: "calculator",
			args: '{"expression":"123 + 456"}',
			result: "579",
		},
	])("$name 도구", ({ name, args, result }) => {
		it("vLLM tool call을 ToolOrchestrator 실행 결과로 변환한다", async () => {
			const execute = jest.fn<Promise<string>, [Record<string, unknown>]>().mockResolvedValue(result);
			const tool: Tool = {
				definition: {
					toolSpec: {
						name,
						description: `${name} test tool`,
						inputSchema: { json: { type: "object", properties: {} } },
					},
				},
				execute,
			};
			orchestrator = new ToolOrchestrator([tool]);
			service = new VllmService();
			service.setToolOrchestrator(orchestrator);

			mockFetch
				.mockResolvedValueOnce(createSSEResponse(toolUseSSE("tool-1", name, args)))
				.mockResolvedValueOnce(createSSEResponse(textSSE("도구 결과를 반영한 최종 응답")));

			const events: unknown[] = [];
			for await (const event of service.chatStream({
				messages: [{ role: "user", content: [{ text: "도구를 사용해줘" }] }],
			})) {
				events.push(event);
			}

			expect(execute).toHaveBeenCalledTimes(1);
			expect(execute).toHaveBeenCalledWith(JSON.parse(args));
			expect(mockFetch).toHaveBeenCalledTimes(2);

			const toolStart = events.find((e) => (e as { type: string }).type === "tool_use_start");
			expect((toolStart as { toolUseId?: string; toolName?: string })?.toolUseId).toBe("tool-1");
			expect((toolStart as { toolUseId?: string; toolName?: string })?.toolName).toBe(name);

			const toolResult = events.find((e) => (e as { type: string }).type === "tool_result");
			expect((toolResult as { toolUseId?: string; toolResult?: string })?.toolUseId).toBe("tool-1");
			expect((toolResult as { toolUseId?: string; toolResult?: string })?.toolResult).toBe(result);
			expect((toolResult as { toolStatus?: string })?.toolStatus).toBe("success");
		});
	});

	it("모델이 도구 호출을 반복하면 제한 횟수 이후 중단한다", async () => {
		const execute = jest.fn<Promise<string>, [Record<string, unknown>]>().mockResolvedValue("ok");
		const tool: Tool = {
			definition: {
				toolSpec: {
					name: "calculator",
					description: "calculator test tool",
					inputSchema: { json: { type: "object", properties: {} } },
				},
			},
			execute,
		};
		orchestrator = new ToolOrchestrator([tool]);
		service = new VllmService();
		service.setToolOrchestrator(orchestrator);

		for (let i = 0; i < 6; i += 1) {
			mockFetch.mockResolvedValueOnce(
				createSSEResponse(toolUseSSE(`tool-${i}`, "calculator", '{"expression":"1 + 1"}')),
			);
		}

		await expect(async () => {
			for await (const _event of service.chatStream({
				messages: [{ role: "user", content: [{ text: "계속 계산해줘" }] }],
			})) {
				// drain stream
			}
		}).rejects.toThrow("도구 호출이 너무 반복되어 응답을 중단했습니다.");
		expect(execute).toHaveBeenCalledTimes(5);
	});

	it("시간 요청은 vLLM 선택을 기다리지 않고 get_current_time 도구를 먼저 실행한다", async () => {
		orchestrator = new ToolOrchestrator([getCurrentTimeTool]);
		service = new VllmService();
		service.setToolOrchestrator(orchestrator);

		const events: unknown[] = [];
		for await (const event of service.chatStream({
			messages: [
				{
					role: "user",
					content: [{ text: "Asia/Seoul 기준 현재 날짜와 시간을 알려줘." }],
				},
			],
		})) {
			events.push(event);
		}

		expect(mockFetch).not.toHaveBeenCalled();
		expect(events.map((event) => (event as { type: string }).type)).toEqual([
			"tool_use_start",
			"tool_result",
			"text_delta",
			"message_complete",
		]);
		expect(events[0]).toMatchObject({
			toolName: "get_current_time",
			toolUseId: "forced-get-current-time",
		});
		expect(events[1]).toMatchObject({
			toolUseId: "forced-get-current-time",
			toolStatus: "success",
		});
		expect((events[1] as { toolResult?: string }).toolResult).toContain("Asia/Seoul");
		expect((events[2] as { text?: string }).text).toContain("도구 결과 기준");
	});

	it("서울 날씨 요청은 forced get_weather 도구에 Open-Meteo용 도시명을 넘긴다", async () => {
		const execute = jest.fn<Promise<string>, [Record<string, unknown>]>().mockResolvedValue(
			"Seoul, South Korea: 맑음, 기온 20°C, 습도 50%, 풍속 2 km/h",
		);
		const weatherTool: Tool = {
			definition: {
				toolSpec: {
					name: "get_weather",
					description: "weather test tool",
					inputSchema: { json: { type: "object", properties: {} } },
				},
			},
			execute,
		};
		orchestrator = new ToolOrchestrator([weatherTool]);
		service = new VllmService();
		service.setToolOrchestrator(orchestrator);

		const events: unknown[] = [];
		for await (const event of service.chatStream({
			messages: [
				{
					role: "user",
					content: [{ text: "서울의 현재 날씨를 알려줘." }],
				},
			],
		})) {
			events.push(event);
		}

		expect(mockFetch).not.toHaveBeenCalled();
		expect(execute).toHaveBeenCalledWith({ city: "Seoul" });
		expect(events[0]).toMatchObject({
			toolName: "get_weather",
			toolUseId: "forced-get-weather",
		});
		expect(events[1]).toMatchObject({
			toolStatus: "success",
			toolResult: "Seoul, South Korea: 맑음, 기온 20°C, 습도 50%, 풍속 2 km/h",
		});
	});

	it("다른 도시 날씨 요청을 서울로 하드코딩하지 않는다", async () => {
		const execute = jest.fn<Promise<string>, [Record<string, unknown>]>().mockResolvedValue(
			"Busan, South Korea: 맑음, 기온 21°C, 습도 55%, 풍속 3 km/h",
		);
		const weatherTool: Tool = {
			definition: {
				toolSpec: {
					name: "get_weather",
					description: "weather test tool",
					inputSchema: { json: { type: "object", properties: {} } },
				},
			},
			execute,
		};
		orchestrator = new ToolOrchestrator([weatherTool]);
		service = new VllmService();
		service.setToolOrchestrator(orchestrator);

		for await (const _event of service.chatStream({
			messages: [
				{
					role: "user",
					content: [{ text: "부산의 현재 날씨를 알려줘." }],
				},
			],
		})) {
			// drain stream
		}

		expect(execute).toHaveBeenCalledWith({ city: "Busan" });
	});
});
