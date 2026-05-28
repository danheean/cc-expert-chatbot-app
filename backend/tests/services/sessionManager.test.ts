import { SessionManager } from "../../src/services/sessionManager";
import { Session } from "../../src/types";

describe("SessionManager", () => {
	let sessionManager: SessionManager;

	beforeEach(() => {
		sessionManager = new SessionManager();
	});

	describe("생성", () => {
		it("자동 생성된 ID로 새 세션을 만든다", () => {
			const session = sessionManager.create();

			expect(session.id).toBeDefined();
			expect(session.id.length).toBeGreaterThan(0);
			expect(session.title).toBe("New Chat");
			expect(session.createdAt).toBeInstanceOf(Date);
			expect(session.updatedAt).toBeInstanceOf(Date);
		});

		it("커스텀 제목으로 세션을 만든다", () => {
			const session = sessionManager.create({ title: "My Chat" });

			expect(session.title).toBe("My Chat");
		});

		it("메타데이터와 함께 세션을 만든다", () => {
			const session = sessionManager.create({
				title: "Project Chat",
				metadata: { project: "ai-chatbot" },
			});

			expect(session.metadata).toEqual({ project: "ai-chatbot" });
		});

		it("클라이언트가 지정한 ID로 세션을 생성한다", () => {
			const session = sessionManager.create({
				id: "custom-id-123",
				title: "Custom",
			});

			expect(session.id).toBe("custom-id-123");
			expect(session.title).toBe("Custom");
			expect(sessionManager.get("custom-id-123")).toEqual(session);
		});
	});

	describe("조회", () => {
		it("ID로 세션을 조회한다", () => {
			const created = sessionManager.create({ title: "Test" });
			const found = sessionManager.get(created.id);

			expect(found).toEqual(created);
		});

		it("존재하지 않는 ID에 대해 undefined를 반환한다", () => {
			const found = sessionManager.get("non-existent-id");

			expect(found).toBeUndefined();
		});
	});

	describe("전체 조회", () => {
		it("모든 세션을 반환한다", () => {
			sessionManager.create({ title: "Chat 1" });
			sessionManager.create({ title: "Chat 2" });
			sessionManager.create({ title: "Chat 3" });

			const sessions = sessionManager.getAll();

			expect(sessions).toHaveLength(3);
		});

		it("updatedAt 내림차순으로 정렬된 세션을 반환한다", () => {
			const session1 = sessionManager.create({ title: "Old" });
			const session2 = sessionManager.create({ title: "New" });

			// session1을 업데이트하여 최신으로 만듦
			sessionManager.update(session1.id, { title: "Updated Old" });

			const sessions = sessionManager.getAll();

			expect(sessions[0].title).toBe("Updated Old");
			expect(sessions[1].title).toBe("New");
		});
	});

	describe("수정", () => {
		it("세션 제목을 수정한다", () => {
			const session = sessionManager.create({ title: "Original" });
			const updated = sessionManager.update(session.id, { title: "Updated" });

			expect(updated?.title).toBe("Updated");
			expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(
				session.createdAt.getTime(),
			);
		});

		it("세션 메타데이터를 수정한다", () => {
			const session = sessionManager.create();
			const updated = sessionManager.update(session.id, {
				metadata: { key: "value" },
			});

			expect(updated?.metadata).toEqual({ key: "value" });
		});

		it("존재하지 않는 ID에 대해 undefined를 반환한다", () => {
			const updated = sessionManager.update("non-existent", { title: "Test" });

			expect(updated).toBeUndefined();
		});
	});

	describe("삭제", () => {
		it("세션을 삭제한다", () => {
			const session = sessionManager.create();
			const deleted = sessionManager.delete(session.id);

			expect(deleted).toBe(true);
			expect(sessionManager.get(session.id)).toBeUndefined();
		});

		it("존재하지 않는 ID에 대해 false를 반환한다", () => {
			const deleted = sessionManager.delete("non-existent");

			expect(deleted).toBe(false);
		});
	});
});

