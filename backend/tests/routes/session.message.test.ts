import request from "supertest";
import { createApp } from "../../src/app";
import { Application } from "express";

describe("세션 메시지 API", () => {
	let app: Application;
	let sessionId: string;

	beforeAll(async () => {
		app = createApp();
		const response = await request(app)
			.post("/api/sessions")
			.send({ title: "Messages Test" });
		sessionId = response.body.id;
	});

	describe("GET /api/sessions/:id/messages", () => {
		it("새 세션은 빈 메시지 배열을 반환한다", async () => {
			const response = await request(app).get(
				`/api/sessions/${sessionId}/messages`,
			);
			expect(response.status).toBe(200);
			expect(response.body).toEqual([]);
		});

		it("존재하지 않는 세션은 404를 반환한다", async () => {
			const response = await request(app).get(
				"/api/sessions/non-existent/messages",
			);
			expect(response.status).toBe(404);
		});
	});

	describe("DELETE /api/sessions/:id/messages", () => {
		it("세션의 메시지를 초기화하면 204를 반환한다", async () => {
			const response = await request(app).delete(
				`/api/sessions/${sessionId}/messages`,
			);
			expect(response.status).toBe(204);
		});

		it("존재하지 않는 세션은 404를 반환한다", async () => {
			const response = await request(app).delete(
				"/api/sessions/non-existent/messages",
			);
			expect(response.status).toBe(404);
		});
	});
});

