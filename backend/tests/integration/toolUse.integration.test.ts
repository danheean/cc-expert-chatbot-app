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

	const toolCases = [
		{
			name: "get_current_time",
			toolUseId: "tool-time-1",
			toolResult: "2026-01-15 10:30:00 Asia/Seoul",
			message: "Asia/Seoul 기준 현재 날짜와 시간을 알려줘.",
			textParts: ["현재 서울 시간은 ", "오전 10시 30분입니다."],
		},
		{
			name: "get_weather",
			toolUseId: "tool-weather-1",
			toolResult: "Seoul, South Korea: 맑음, 기온 15°C, 습도 40%, 풍속 3 km/h",
			message: "서울의 현재 날씨를 알려줘.",
			textParts: ["서울의 현재 날씨는 ", "맑고 15°C입니다."],
		},
		{
			name: "calculator",
			toolUseId: "tool-calculator-1",
			toolResult: "579",
			message: "123 + 456을 계산해줘.",
			textParts: ["123 + 456은 ", "579입니다."],
		},
	] as const;

	describe.each(toolCases)("$name 도구", ({ name, toolUseId, toolResult, message, textParts }) => {
		it("도구 실행 흐름을 SSE로 반환한다", async () => {
			// 1. 세션 생성
			const sessionResponse = await request(app).post("/api/sessions").send({});
			const sessionId = sessionResponse.body.id as string;

			// 2. chatStream을 tool_use → 결과 → 텍스트 흐름으로 모킹
			jest.spyOn(VllmService.prototype, "chatStream").mockImplementation(
				mockStream(
					{
						type: "tool_use_start",
						toolName: name,
						toolUseId,
					},
					{
						type: "tool_result",
						toolUseId,
						toolResult,
						toolStatus: "success",
					},
					{ type: "text_delta", text: textParts[0] },
					{ type: "text_delta", text: textParts[1] },
					{
						type: "message_complete",
						usage: { inputTokens: 30, outputTokens: 15 },
					},
				),
			);

			// 3. 채팅 요청
			const response = await request(app)
				.post("/api/chat")
				.send({ sessionId, message });

			expect(response.status).toBe(200);

			const events = parseSseEvents(response.text);

			// tool_start 이벤트가 있는지 확인
			const toolStartEvent = events.find((e) => e.event === "tool_start");
			expect(toolStartEvent).toBeDefined();
			expect((toolStartEvent?.data as { toolName?: string })?.toolName).toBe(name);
			expect((toolStartEvent?.data as { toolId?: string })?.toolId).toBe(toolUseId);
			expect((toolStartEvent?.data as { toolUseId?: string })?.toolUseId).toBe(toolUseId);

			// tool_result 이벤트가 있는지 확인
			const toolResultEvent = events.find((e) => e.event === "tool_result");
			expect(toolResultEvent).toBeDefined();
			expect((toolResultEvent?.data as { toolId?: string })?.toolId).toBe(toolUseId);
			expect((toolResultEvent?.data as { toolUseId?: string })?.toolUseId).toBe(toolUseId);
			expect((toolResultEvent?.data as { toolResult?: string })?.toolResult).toBe(toolResult);
			expect((toolResultEvent?.data as { toolStatus?: string })?.toolStatus).toBe("success");

			// 최종 텍스트 이벤트가 있는지 확인
			const textEvents = events.filter((e) => e.event === "text");
			expect(textEvents.map((e) => (e.data as { text?: string }).text).join("")).toBe(
				textParts.join(""),
			);

			const doneEvent = events.find((e) => e.event === "done");
			expect(doneEvent).toBeDefined();
		});
	});
});
