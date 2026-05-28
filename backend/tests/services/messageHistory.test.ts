import { MessageHistory } from "../../src/services/messageHistory";
import { Message } from "../../src/types";

describe("MessageHistory", () => {
	let history: MessageHistory;

	beforeEach(() => {
		history = new MessageHistory();
	});

	describe("메시지 추가", () => {
		it("사용자 메시지를 추가한다", () => {
			const message: Message = {
				role: "user",
				content: [{ text: "Hello" }],
			};

			history.add("session-1", message);
			const messages = history.get("session-1");

			expect(messages).toHaveLength(1);
			expect(messages[0]).toEqual(message);
		});

		it("어시스턴트 메시지를 추가한다", () => {
			const userMessage: Message = {
				role: "user",
				content: [{ text: "Hello" }],
			};
			const assistantMessage: Message = {
				role: "assistant",
				content: [{ text: "Hi there!" }],
			};

			history.add("session-1", userMessage);
			history.add("session-1", assistantMessage);
			const messages = history.get("session-1");

			expect(messages).toHaveLength(2);
			expect(messages[1].role).toBe("assistant");
		});

		it("세션별로 독립된 히스토리를 유지한다", () => {
			history.add("session-1", {
				role: "user",
				content: [{ text: "Session 1" }],
			});
			history.add("session-2", {
				role: "user",
				content: [{ text: "Session 2" }],
			});

			expect(history.get("session-1")).toHaveLength(1);
			expect(history.get("session-2")).toHaveLength(1);
			expect(history.get("session-1")[0].content[0].text).toBe("Session 1");
			expect(history.get("session-2")[0].content[0].text).toBe("Session 2");
		});
	});

	describe("메시지 조회", () => {
		it("존재하지 않는 세션에 대해 빈 배열을 반환한다", () => {
			const messages = history.get("non-existent");

			expect(messages).toEqual([]);
		});

		it("메시지를 순서대로 반환한다", () => {
			history.add("session-1", { role: "user", content: [{ text: "First" }] });
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "Second" }],
			});
			history.add("session-1", { role: "user", content: [{ text: "Third" }] });

			const messages = history.get("session-1");

			expect(messages[0].content[0].text).toBe("First");
			expect(messages[1].content[0].text).toBe("Second");
			expect(messages[2].content[0].text).toBe("Third");
		});
	});

	describe("메시지 초기화", () => {
		it("세션의 모든 메시지를 초기화한다", () => {
			history.add("session-1", { role: "user", content: [{ text: "Hello" }] });
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "Hi" }],
			});

			history.clear("session-1");

			expect(history.get("session-1")).toEqual([]);
		});

		it("다른 세션에 영향을 주지 않는다", () => {
			history.add("session-1", {
				role: "user",
				content: [{ text: "Session 1" }],
			});
			history.add("session-2", {
				role: "user",
				content: [{ text: "Session 2" }],
			});

			history.clear("session-1");

			expect(history.get("session-1")).toEqual([]);
			expect(history.get("session-2")).toHaveLength(1);
		});
	});

	describe("히스토리 삭제", () => {
		it("세션 히스토리 전체를 삭제한다", () => {
			history.add("session-1", { role: "user", content: [{ text: "Hello" }] });

			const deleted = history.delete("session-1");

			expect(deleted).toBe(true);
			expect(history.get("session-1")).toEqual([]);
		});

		it("존재하지 않는 세션에 대해 false를 반환한다", () => {
			const deleted = history.delete("non-existent");

			expect(deleted).toBe(false);
		});
	});
});

describe("MessageHistory with limits", () => {
	describe("maxMessages 제한", () => {
		it("제한 초과 시 가장 오래된 user-assistant 쌍을 제거한다", () => {
			const history = new MessageHistory({ maxMessages: 4 });

			// 6개 메시지 추가 (user, assistant, user, assistant, user, assistant)
			history.add("session-1", {
				role: "user",
				content: [{ text: "Message 1" }],
			});
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "Reply 1" }],
			});
			history.add("session-1", {
				role: "user",
				content: [{ text: "Message 2" }],
			});
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "Reply 2" }],
			});
			history.add("session-1", {
				role: "user",
				content: [{ text: "Message 3" }],
			});
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "Reply 3" }],
			});

			const messages = history.get("session-1");

			// 첫 번째 쌍(Message 1, Reply 1) 제거 -> 4개 남음
			expect(messages).toHaveLength(4);
			expect(messages[0].content[0].text).toBe("Message 2");
		});

		it("트리밍 시 user-assistant 쌍 단위를 유지한다", () => {
			const history = new MessageHistory({ maxMessages: 3 });

			// 5개 메시지 추가 (user, assistant, user, assistant, user)
			history.add("session-1", { role: "user", content: [{ text: "U1" }] });
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "A1" }],
			});
			history.add("session-1", { role: "user", content: [{ text: "U2" }] });
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "A2" }],
			});
			history.add("session-1", { role: "user", content: [{ text: "U3" }] });

			const messages = history.get("session-1");

			// 쌍 단위 제거로 U1+A1 제거 -> 3개 남음
			expect(messages).toHaveLength(3);
			expect(messages[0].role).toBe("user");
			expect(messages[0].content[0].text).toBe("U2");
		});
	});

	describe("getWithLimit", () => {
		it("최근 N개의 메시지만 반환한다", () => {
			const history = new MessageHistory();

			history.add("session-1", { role: "user", content: [{ text: "M1" }] });
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "M2" }],
			});
			history.add("session-1", { role: "user", content: [{ text: "M3" }] });
			history.add("session-1", {
				role: "assistant",
				content: [{ text: "M4" }],
			});

			const messages = history.getWithLimit("session-1", 2);

			expect(messages).toHaveLength(2);
			expect(messages[0].content[0].text).toBe("M3");
			expect(messages[1].content[0].text).toBe("M4");
		});
	});
});

