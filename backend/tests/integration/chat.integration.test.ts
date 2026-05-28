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

describe("채팅 통합 테스트", () => {
	let app: Application;

	beforeAll(() => {
		app = createApp();
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe("전체 채팅 흐름", () => {
		it("세션 생성, 메시지 전송, 응답 수신의 전체 흐름을 처리한다", async () => {
			// 1. 세션 생성
			const sessionResponse = await request(app)
				.post("/api/sessions")
				.send({ title: "Integration Test Chat" });

			expect(sessionResponse.status).toBe(201);
			const sessionId = sessionResponse.body.id;

			// 2. vLLM 스트리밍 응답 모킹
			jest.spyOn(VllmService.prototype, "chatStream").mockImplementation(
				mockStream(
					{ type: "text_delta", text: "Hello! " },
					{ type: "text_delta", text: "How can I help?" },
					{ type: "message_complete", usage: { inputTokens: 10, outputTokens: 5 } },
				),
			);

			// 3. 채팅 메시지 전송
			const chatResponse = await request(app)
				.post("/api/chat")
				.send({ sessionId, message: "Hello!" });

			expect(chatResponse.status).toBe(200);
			expect(chatResponse.headers["content-type"]).toMatch(/text\/event-stream/);

			// 4. 세션의 메시지 히스토리 확인
			const historyResponse = await request(app).get(
				`/api/sessions/${sessionId}/messages`,
			);

			expect(historyResponse.status).toBe(200);
			expect(historyResponse.body.length).toBeGreaterThanOrEqual(1);
		});

		it("메시지 간 대화 컨텍스트를 유지한다", async () => {
			// 1. 세션 생성
			const sessionResponse = await request(app).post("/api/sessions").send({});
			const sessionId = sessionResponse.body.id;

			// 2. 두 번의 vLLM 호출을 순서대로 모킹
			const spy = jest.spyOn(VllmService.prototype, "chatStream");
			spy.mockImplementationOnce(
				mockStream(
					{ type: "text_delta", text: "I am Claude." },
					{ type: "message_complete", usage: { inputTokens: 5, outputTokens: 5 } },
				),
			);
			spy.mockImplementationOnce(
				mockStream(
					{ type: "text_delta", text: "As I mentioned, I am Claude." },
					{ type: "message_complete", usage: { inputTokens: 10, outputTokens: 8 } },
				),
			);

			// 3. 첫 번째 메시지
			await request(app)
				.post("/api/chat")
				.send({ sessionId, message: "What is your name?" });

			// 4. 두 번째 메시지
			await request(app)
				.post("/api/chat")
				.send({ sessionId, message: "Can you repeat your name?" });

			// 5. 히스토리에 4개 메시지 (user, assistant, user, assistant)
			const historyResponse = await request(app).get(
				`/api/sessions/${sessionId}/messages`,
			);

			expect(historyResponse.body).toHaveLength(4);
			expect(historyResponse.body[0].role).toBe("user");
			expect(historyResponse.body[1].role).toBe("assistant");
			expect(historyResponse.body[2].role).toBe("user");
			expect(historyResponse.body[3].role).toBe("assistant");
		});
	});

	describe("에러 시나리오", () => {
		it("vLLM API 에러를 적절히 처리한다", async () => {
			const sessionResponse = await request(app).post("/api/sessions").send({});
			const sessionId = sessionResponse.body.id;

			// vLLM 에러 모킹
			jest.spyOn(VllmService.prototype, "chatStream").mockImplementation(
				async function* () {
					throw new Error("vLLM service unavailable");
				} as unknown as ChatStreamFn,
			);

			const response = await request(app)
				.post("/api/chat")
				.send({ sessionId, message: "Hello" });

			expect(response.status).toBe(200);
			expect(response.text).toContain("error");
		});

		it("요청 제한 에러를 처리한다", async () => {
			const sessionResponse = await request(app).post("/api/sessions").send({});
			const sessionId = sessionResponse.body.id;

			// Rate limit 에러 모킹
			jest.spyOn(VllmService.prototype, "chatStream").mockImplementation(
				async function* () {
					throw new Error("RATE_LIMITED");
				} as unknown as ChatStreamFn,
			);

			const response = await request(app)
				.post("/api/chat")
				.send({ sessionId, message: "Hello" });

			expect(response.text).toContain("error");
		});

		it("유효하지 않은 세션을 적절히 처리한다", async () => {
			// 존재하지 않는 세션으로 채팅 시도 — SSE는 항상 200으로 시작
			jest.spyOn(VllmService.prototype, "chatStream").mockImplementation(
				mockStream(
					{ type: "message_complete", usage: { inputTokens: 0, outputTokens: 0 } },
				),
			);

			const response = await request(app)
				.post("/api/chat")
				.send({ sessionId: "non-existent-session", message: "Hello" });

			expect(response.status).toBe(200);
		});
	});
});
