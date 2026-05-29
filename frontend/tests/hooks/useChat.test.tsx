import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "../../src/hooks/useChat";

// SSE 모킹
vi.mock("../../src/services/sse", () => ({
	streamChat: vi.fn(),
}));

import { streamChat } from "../../src/services/sse";

const mockFetch = vi.fn();
global.fetch = mockFetch;

function mockFetchMessages(
	messages: { role: string; content: { text: string }[] }[],
) {
	mockFetch.mockResolvedValueOnce({
		ok: true,
		json: async () => messages,
	});
}

// 초기 메시지 로드(useEffect)가 완료될 때까지 대기
async function waitForLoad(_result: { current: { messages: unknown[] } }) {
	await waitFor(() => {
		expect(mockFetch).toHaveBeenCalled();
	});
	// 상태 업데이트 반영 대기
	await act(async () => {});
}

describe("useChat 훅", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFetch.mockResolvedValue({ ok: true, json: async () => [] });
	});

	it("빈 메시지로 초기화된다", () => {
		const { result } = renderHook(() => useChat("session-1"));

		expect(result.current.messages).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("sendMessage 호출 시 사용자 메시지를 추가한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sessionId: string, _message: string, onEvent: any) => {
				onEvent({ type: "done" });
			},
		);

		const { result } = renderHook(() => useChat("session-1"));

		await act(async () => {
			await result.current.sendMessage("Hello");
		});

		expect(result.current.messages[0].role).toBe("user");
		expect(result.current.messages[0].content).toBe("Hello");
	});

	it("텍스트 이벤트로 어시스턴트 메시지를 업데이트한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sessionId: string, _message: string, onEvent: any) => {
				onEvent({ type: "text", content: "Hi" });
				onEvent({ type: "text", content: " there" });
				onEvent({ type: "done" });
			},
		);

		const { result } = renderHook(() => useChat("session-1"));

		await act(async () => {
			await result.current.sendMessage("Hello");
		});

		expect(result.current.messages[1].role).toBe("assistant");
		expect(result.current.messages[1].content).toBe("Hi there");
	});

	it("스트리밍 중 isLoading을 설정한다", async () => {
		let resolveStream: () => void;
		const streamPromise = new Promise<void>((resolve) => {
			resolveStream = resolve;
		});

		(streamChat as any).mockImplementation(async () => {
			await streamPromise;
		});

		const { result } = renderHook(() => useChat("session-1"));

		act(() => {
			result.current.sendMessage("Hello");
		});

		expect(result.current.isLoading).toBe(true);

		await act(async () => {
			resolveStream!();
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});
	});

	it("도구 이벤트를 처리한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sessionId: string, _message: string, onEvent: any) => {
				onEvent({
					type: "tool_start",
					toolId: "tool-1",
					toolName: "get_weather",
				});
				onEvent({
					type: "tool_result",
					toolId: "tool-1",
					toolResult: "서울: 맑음, 15도",
				});
				onEvent({ type: "text", content: "서울 날씨는 맑고 15도입니다." });
				onEvent({ type: "done" });
			},
		);

		const { result } = renderHook(() => useChat("session-1"));

		await act(async () => {
			await result.current.sendMessage("서울 날씨 알려줘");
		});

		const assistantMessage = result.current.messages[1];
		expect(assistantMessage.toolCalls).toHaveLength(1);
		expect(assistantMessage.toolCalls?.[0].name).toBe("get_weather");
		expect(assistantMessage.toolCalls?.[0].status).toBe("success");
		expect(assistantMessage.toolCalls?.[0].result).toBe("서울: 맑음, 15도");
	});

	it("백엔드 toolUseId 형태의 도구 결과를 같은 도구 호출에 매칭한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sessionId: string, _message: string, onEvent: any) => {
				onEvent({
					type: "tool_start",
					toolUseId: "tool-1",
					toolName: "calculator",
				});
				onEvent({
					type: "tool_result",
					toolUseId: "tool-1",
					toolResult: "579",
					toolStatus: "success",
				});
				onEvent({ type: "text", content: "123 + 456은 579입니다." });
				onEvent({ type: "done" });
			},
		);

		const { result } = renderHook(() => useChat("session-1"));

		await act(async () => {
			await result.current.sendMessage("123 + 456을 계산해줘.");
		});

		const assistantMessage = result.current.messages[1];
		expect(assistantMessage.toolCalls).toHaveLength(1);
		expect(assistantMessage.toolCalls?.[0]).toMatchObject({
			id: "tool-1",
			name: "calculator",
			status: "success",
			result: "579",
		});
	});

	it("도구 결과가 error status이면 실패 상태로 표시한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sessionId: string, _message: string, onEvent: any) => {
				onEvent({
					type: "tool_start",
					toolId: "tool-1",
					toolName: "get_weather",
				});
				onEvent({
					type: "tool_result",
					toolId: "tool-1",
					toolResult: "Error: City not found: 없는도시",
					toolStatus: "error",
				});
				onEvent({ type: "done" });
			},
		);

		const { result } = renderHook(() => useChat("session-1"));

		await act(async () => {
			await result.current.sendMessage("없는도시의 현재 날씨를 알려줘.");
		});

		expect(result.current.messages[1].toolCalls?.[0]).toMatchObject({
			id: "tool-1",
			name: "get_weather",
			status: "error",
			result: "Error: City not found: 없는도시",
		});
	});

	it("에러를 처리한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sessionId: string, _message: string, onEvent: any) => {
				onEvent({ type: "error", error: "Something went wrong" });
			},
		);

		const { result } = renderHook(() => useChat("session-1"));

		await act(async () => {
			await result.current.sendMessage("Hello");
		});

		expect(result.current.error).toBe("Something went wrong");
	});

	it("sessionId가 변경되면 상태를 초기화한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sessionId: string, _message: string, onEvent: any) => {
				onEvent({ type: "text", content: "Response" });
				onEvent({ type: "done" });
			},
		);

		const { result, rerender } = renderHook(
			({ sessionId }) => useChat(sessionId),
			{ initialProps: { sessionId: "session-1" } },
		);

		await act(async () => {
			await result.current.sendMessage("Hello");
		});

		expect(result.current.messages.length).toBeGreaterThan(0);

		rerender({ sessionId: "session-2" });

		expect(result.current.messages).toEqual([]);
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("메시지를 초기화한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sessionId: string, _message: string, onEvent: any) => {
				onEvent({ type: "text", content: "Hello" });
				onEvent({ type: "done" });
			},
		);

		const { result } = renderHook(() => useChat("session-1"));

		await act(async () => {
			await result.current.sendMessage("Test");
		});

		expect(result.current.messages.length).toBeGreaterThan(0);

		act(() => {
			result.current.clearMessages();
		});

		expect(result.current.messages).toEqual([]);
	});

	it("overrideSessionId를 제공하면 빈 sessionId를 무시하고 API를 호출한다", async () => {
		(streamChat as any).mockImplementation(
			async (_sid: string, _msg: string, onEvent: any) => {
				onEvent({ type: "done" });
			},
		);
		const { result } = renderHook(() => useChat(""));

		await act(async () => {
			await result.current.sendMessage("안녕", "override-session-123");
		});

		expect(streamChat).toHaveBeenCalledWith(
			"override-session-123",
			"안녕",
			expect.any(Function),
			expect.anything(),
		);
		expect(result.current.messages[0].content).toBe("안녕");
	});

	it("sessionId가 빈 문자열이면 sendMessage가 API를 호출하지 않는다", async () => {
		const { result } = renderHook(() => useChat(""));

		await act(async () => {
			await result.current.sendMessage("안녕");
		});

		const chatCall = mockFetch.mock.calls.find((call) => call[0] === "/api/chat");
		expect(chatCall).toBeUndefined();
		expect(result.current.messages).toHaveLength(0);
		expect(result.current.error).toBeNull();
	});

	it("sessionId가 변경되면 백엔드에서 메시지를 로드한다", async () => {
		const { result, rerender } = renderHook(
			({ sessionId }) => useChat(sessionId),
			{ initialProps: { sessionId: "session-1" } },
		);
		await waitForLoad(result);

		mockFetch.mockReset();
		mockFetchMessages([
			{ role: "user", content: [{ text: "이전 질문" }] },
			{ role: "assistant", content: [{ text: "이전 응답" }] },
		]);

		await act(async () => {
			rerender({ sessionId: "session-2" });
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(2);
		});

		expect(result.current.messages[0].role).toBe("user");
		expect(result.current.messages[0].content).toBe("이전 질문");
		expect(result.current.messages[1].role).toBe("assistant");
		expect(result.current.messages[1].content).toBe("이전 응답");
		expect(mockFetch).toHaveBeenCalledWith("/api/sessions/session-2/messages");
	});
});
