import { renderHook, act } from "@testing-library/react";
import { useSession } from "../../src/hooks/useSession";

// localStorage 모킹
// (() => { ... })() 는 즉시 실행 함수(IIFE)다. 함수를 정의하는 동시에 실행하여,
// store 변수를 외부에서 접근할 수 없는 비공개 변수로 만든다.
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] || null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		clear: vi.fn(() => {
			store = {};
		}),
	};
})();
// Object.defineProperty는 객체의 속성을 세밀하게 정의하는 메서드다.
// 테스트 환경에는 브라우저의 localStorage가 없으므로, window 객체에 가짜 구현을 주입한다.
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// fetch 모킹
const mockFetch = vi.fn().mockResolvedValue({ ok: true });
global.fetch = mockFetch;

describe("useSession", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		mockFetch.mockResolvedValue({ ok: true });
	});

	it("createSession은 생성된 세션을 반환한다", () => {
		const { result } = renderHook(() => useSession());
		let returned: ReturnType<typeof result.current.createSession> | undefined;
		act(() => {
			returned = result.current.createSession();
		});
		expect(returned?.id).toBe(result.current.sessions[0].id);
		expect(returned?.title).toContain("새 대화");
	});

	it("빈 세션 배열로 초기화한다", () => {
		const { result } = renderHook(() => useSession());
		expect(result.current.sessions).toEqual([]);
		expect(result.current.currentSession).toBeNull();
	});

	it("새 세션을 생성한다", () => {
		const { result } = renderHook(() => useSession());
		act(() => {
			result.current.createSession();
		});
		expect(result.current.sessions).toHaveLength(1);
		expect(result.current.currentSession?.title).toContain("새 대화");
	});

	it("현재 세션 삭제 시 currentSession을 재설정한다", () => {
		const { result } = renderHook(() => useSession());
		act(() => {
			result.current.createSession();
			result.current.createSession();
		});
		const currentId = result.current.currentSession!.id;
		act(() => {
			result.current.deleteSession(currentId);
		});
		expect(result.current.currentSession).not.toBeNull();
		expect(result.current.currentSession?.id).not.toBe(currentId);
	});

	it("마지막 세션 삭제 시 currentSession을 null로 설정한다", () => {
		const { result } = renderHook(() => useSession());
		act(() => {
			result.current.createSession();
		});
		const onlyId = result.current.sessions[0].id;
		act(() => {
			result.current.deleteSession(onlyId);
		});
		expect(result.current.currentSession).toBeNull();
	});

	it("세션을 선택한다", () => {
		const { result } = renderHook(() => useSession());
		act(() => {
			result.current.createSession();
			result.current.createSession();
		});
		const firstId = result.current.sessions[0].id;
		act(() => {
			result.current.selectSession(firstId);
		});
		expect(result.current.currentSession?.id).toBe(firstId);
	});

	it("세션을 localStorage에 저장한다", () => {
		const { result } = renderHook(() => useSession());
		act(() => {
			result.current.createSession();
		});
		expect(localStorageMock.setItem).toHaveBeenCalled();
	});

	it("세션 생성 시 백엔드 API를 호출한다", () => {
		const { result } = renderHook(() => useSession());
		act(() => {
			result.current.createSession();
		});

		const createCall = mockFetch.mock.calls.find(
			(call) => call[0] === "/api/sessions" && call[1]?.method === "POST",
		);
		expect(createCall).toBeDefined();
		const body = JSON.parse(createCall![1].body);
		expect(body.id).toBe(result.current.sessions[0].id);
		expect(body.title).toContain("새 대화");
	});

	it("세션 삭제 시 백엔드 API를 호출한다", () => {
		const { result } = renderHook(() => useSession());
		act(() => {
			result.current.createSession();
		});
		const sessionId = result.current.sessions[0].id;

		mockFetch.mockClear();
		act(() => {
			result.current.deleteSession(sessionId);
		});

		expect(mockFetch).toHaveBeenCalledWith(`/api/sessions/${sessionId}`, {
			method: "DELETE",
		});
	});

	it("마운트 시 기존 세션을 백엔드에 동기화한다", () => {
		const existingSessions = [
			{
				id: "existing-1",
				title: "기존 대화",
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		];
		localStorageMock.setItem(
			"chatbot-sessions",
			JSON.stringify(existingSessions),
		);

		renderHook(() => useSession());

		const syncCall = mockFetch.mock.calls.find((call) => {
			if (call[0] !== "/api/sessions" || call[1]?.method !== "POST")
				return false;
			const body = JSON.parse(call[1].body);
			return body.id === "existing-1";
		});
		expect(syncCall).toBeDefined();
	});
});
