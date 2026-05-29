import { streamChat } from "../../src/services/sse";
import type { SSEEvent } from "../../src/services/sse";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ReadableStream 헬퍼: SSE 응답을 시뮬레이션
function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	let index = 0;
	return new ReadableStream({
		pull(controller) {
			if (index < chunks.length) {
				controller.enqueue(encoder.encode(chunks[index]));
				index++;
			} else {
				controller.close();
			}
		},
	});
}

describe("스트리밍 채팅", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("SSE 이벤트를 올바르게 파싱한다", async () => {
		const sseData = [
			'event: text\ndata: {"text":"Hello"}\n\n',
			'event: text\ndata: {"text":" World"}\n\n',
			"event: done\ndata: {}\n\n",
		];
		mockFetch.mockResolvedValueOnce({
			ok: true,
			body: createMockStream(sseData),
		});

		const events: SSEEvent[] = [];
		await streamChat("session-1", "Hi", (e) => events.push(e));

		expect(events).toHaveLength(3);
		expect(events[0].content).toBe("Hello");
		expect(events[2].type).toBe("done");
		expect(mockFetch).toHaveBeenCalledWith("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ sessionId: "session-1", message: "Hi" }),
		});
	});

	it("HTTP 에러 시 예외를 던진다", async () => {
		mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
		await expect(streamChat("session-1", "Hi", vi.fn())).rejects.toThrow(
			"HTTP error: 500",
		);
	});

	it("백엔드 error 이벤트의 message 필드를 error로 파싱한다", async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			body: createMockStream([
				'event: error\ndata: {"message":"도구 호출이 너무 반복되어 응답을 중단했습니다."}\n\n',
			]),
		});

		const events: SSEEvent[] = [];
		await streamChat("session-1", "Hi", (e) => events.push(e));

		expect(events[0]).toMatchObject({
			type: "error",
			error: "도구 호출이 너무 반복되어 응답을 중단했습니다.",
		});
	});

	it("버퍼 경계를 넘는 청크 데이터를 처리한다", async () => {
		const sseData = [
			'event: text\ndata: {"text":',
			'"split"}\n\nevent: done\ndata: {}\n\n',
		];
		mockFetch.mockResolvedValueOnce({
			ok: true,
			body: createMockStream(sseData),
		});

		const events: SSEEvent[] = [];
		await streamChat("session-1", "Hi", (e) => events.push(e));
		expect(events[0].content).toBe("split");
	});

	it("백엔드 toolUseId를 프론트 toolId로 정규화한다", async () => {
		const sseData = [
			'event: tool_start\ndata: {"toolName":"calculator","toolUseId":"tool-1"}\n\n',
			'event: tool_result\ndata: {"toolUseId":"tool-1","toolResult":"579","toolStatus":"success"}\n\n',
		];
		mockFetch.mockResolvedValueOnce({
			ok: true,
			body: createMockStream(sseData),
		});

		const events: SSEEvent[] = [];
		await streamChat("session-1", "123 + 456을 계산해줘.", (e) => events.push(e));

		expect(events[0]).toMatchObject({
			type: "tool_start",
			toolId: "tool-1",
			toolName: "calculator",
		});
		expect(events[1]).toMatchObject({
			type: "tool_result",
			toolId: "tool-1",
			toolResult: "579",
			toolStatus: "success",
		});
	});
});
