import { VllmService } from "../../src/services/vllm";
import { ToolOrchestrator } from "../../src/services/toolOrchestrator";

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
});
