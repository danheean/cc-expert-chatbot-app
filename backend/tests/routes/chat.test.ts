import request from "supertest";
import { createApp } from "../../src/app";
import { Application } from "express";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { mockClient } from "aws-sdk-client-mock";

const bedrockMock = mockClient(BedrockRuntimeClient);

describe("POST /api/chat", () => {
	let app: Application;

	beforeAll(() => {
		app = createApp();
	});

	beforeEach(() => {
		bedrockMock.reset();
	});

	describe("입력 검증", () => {
		it("sessionId가 없으면 400을 반환한다", async () => {
			const response = await request(app)
				.post("/api/chat")
				.send({ message: "Hello" });

			expect(response.status).toBe(400);
			expect(response.body.error.message).toBe("세션 ID가 필요합니다.");
		});

		it("message가 없으면 400을 반환한다", async () => {
			const response = await request(app)
				.post("/api/chat")
				.send({ sessionId: "test-session" });

			expect(response.status).toBe(400);
			expect(response.body.error.message).toBe("메시지를 입력해주세요.");
		});

		it("message가 빈 문자열이면 400을 반환한다", async () => {
			const response = await request(app)
				.post("/api/chat")
				.send({ sessionId: "test-session", message: "" });

			expect(response.status).toBe(400);
			expect(response.body.error.message).toBe("메시지를 입력해주세요.");
		});
	});

	describe("SSE 스트리밍", () => {
		it("SSE content-type 헤더를 반환한다", async () => {
			// 스트리밍 응답 모킹은 복잡하므로 헤더만 테스트
			const response = await request(app)
				.post("/api/chat")
				.send({ sessionId: "test-session", message: "Hello" })
				.expect("Content-Type", /text\/event-stream/);
		});
	});
});

