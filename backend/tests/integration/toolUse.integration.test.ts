import request from "supertest";
import { createApp } from "../../src/app";
import { Application } from "express";
import { VllmService } from "../../src/services/vllm";
import { StreamEvent } from "../../src/types";

type ChatStreamFn = typeof VllmService.prototype.chatStream;

function mockStream(...events: StreamEvent[]): ChatStreamFn {
	return async function* () {
		for (const event of events) {
			yield event;
		}
	} as unknown as ChatStreamFn;
}

function parseSseEvents(text: string): Array<{ event?: string; data: unknown }> {
	return text
		.split("\n\n")
		.filter((block) => block.trim() !== "")
		.map((block) => {
			const lines = block.split("\n");
			const eventLine = lines.find((l) => l.startsWith("event:"));
			const dataLine = lines.find((l) => l.startsWith("data:"));
			return {
				event: eventLine?.replace("event: ", ""),
				data: dataLine
					? (JSON.parse(dataLine.replace("data: ", "")) as unknown)
					: null,
			};
		});
}

describe("Tool Use 통합 테스트", () => {
	let app: Application;

	beforeAll(() => {
		app = createApp();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("get_current_time 도구", () => {
		it("시간 도구를 실행하고 응답을 반환한다", async () => {
			// 1. 세션 생성
			const sessionResponse = await request(app).post("/api/sessions").send({});
			const sessionId = sessionResponse.body.id as string;

			// 2. chatStream을 tool_use → 결과 → 텍스트 흐름으로 모킹
			jest.spyOn(VllmService.prototype, "chatStream").mockImplementation(
				mockStream(
					{
						type: "tool_use_start",
						toolName: "get_current_time",
						toolUseId: "tool-1",
					},
					{
						type: "tool_result",
						toolResult: "2026-01-15 10:30:00 Asia/Seoul",
					},
					{ type: "text_delta", text: "현재 서울 시간은 " },
					{ type: "text_delta", text: "오전 10시 30분입니다." },
					{
						type: "message_complete",
						usage: { inputTokens: 30, outputTokens: 15 },
					},
				),
			);

			// 3. 채팅 요청
			const response = await request(app)
				.post("/api/chat")
				.send({ sessionId, message: "지금 몇 시야?" });

			expect(response.status).toBe(200);

			const events = parseSseEvents(response.text);

			// tool_start 이벤트가 있는지 확인
			const toolStartEvent = events.find((e) => e.event === "tool_start");
			expect(toolStartEvent).toBeDefined();
			expect(
				(toolStartEvent?.data as { toolName?: string })?.toolName,
			).toBe("get_current_time");

			// tool_result 이벤트가 있는지 확인
			const toolResultEvent = events.find((e) => e.event === "tool_result");
			expect(toolResultEvent).toBeDefined();

			// 최종 텍스트 이벤트가 있는지 확인
			const textEvents = events.filter((e) => e.event === "text");
			expect(textEvents.length).toBeGreaterThanOrEqual(1);
		});
	});
});
