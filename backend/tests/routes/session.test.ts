import request from "supertest";
import { createApp } from "../../src/app";
import { Application } from "express";

describe("세션 API", () => {
	let app: Application;

	beforeAll(() => {
		app = createApp();
	});

	describe("POST /api/sessions", () => {
		it("새 세션을 생성한다", async () => {
			const response = await request(app)
				.post("/api/sessions")
				.send({ title: "Test Chat" });

			expect(response.status).toBe(201);
			expect(response.body.id).toBeDefined();
			expect(response.body.title).toBe("Test Chat");
		});

		it("기본 제목으로 세션을 생성한다", async () => {
			const response = await request(app).post("/api/sessions").send({});

			expect(response.status).toBe(201);
			expect(response.body.title).toBe("New Chat");
		});

		it("클라이언트가 지정한 ID로 세션을 생성한다", async () => {
			const response = await request(app)
				.post("/api/sessions")
				.send({ id: "client-id-456", title: "Client Session" });

			expect(response.status).toBe(201);
			expect(response.body.id).toBe("client-id-456");
			expect(response.body.title).toBe("Client Session");

			// 해당 ID로 조회 가능한지 검증
			const getResponse = await request(app).get("/api/sessions/client-id-456");
			expect(getResponse.status).toBe(200);
			expect(getResponse.body.id).toBe("client-id-456");
		});
	});

	describe("GET /api/sessions", () => {
		it("모든 세션을 반환한다", async () => {
			// 먼저 세션 생성
			await request(app).post("/api/sessions").send({ title: "Chat 1" });
			await request(app).post("/api/sessions").send({ title: "Chat 2" });

			const response = await request(app).get("/api/sessions");

			expect(response.status).toBe(200);
			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("GET /api/sessions/:id", () => {
		it("ID로 세션을 조회한다", async () => {
			const createResponse = await request(app)
				.post("/api/sessions")
				.send({ title: "Test" });

			const sessionId = createResponse.body.id;

			const response = await request(app).get(`/api/sessions/${sessionId}`);

			expect(response.status).toBe(200);
			expect(response.body.id).toBe(sessionId);
		});

		it("존재하지 않는 세션에 대해 404를 반환한다", async () => {
			const response = await request(app).get("/api/sessions/non-existent");

			expect(response.status).toBe(404);
		});
	});

	describe("PUT /api/sessions/:id", () => {
		it("세션을 수정한다", async () => {
			const createResponse = await request(app)
				.post("/api/sessions")
				.send({ title: "Original" });

			const sessionId = createResponse.body.id;

			const response = await request(app)
				.put(`/api/sessions/${sessionId}`)
				.send({ title: "Updated" });

			expect(response.status).toBe(200);
			expect(response.body.title).toBe("Updated");
		});
	});

	describe("DELETE /api/sessions/:id", () => {
		it("세션을 삭제한다", async () => {
			const createResponse = await request(app)
				.post("/api/sessions")
				.send({ title: "To Delete" });

			const sessionId = createResponse.body.id;

			const response = await request(app).delete(`/api/sessions/${sessionId}`);

			expect(response.status).toBe(204);

			// 삭제 확인
			const getResponse = await request(app).get(`/api/sessions/${sessionId}`);
			expect(getResponse.status).toBe(404);
		});
	});
});


