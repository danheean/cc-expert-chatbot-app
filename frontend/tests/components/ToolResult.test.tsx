import { render, screen } from "@testing-library/react";
import { ToolResult } from "../../src/components/chat/ToolResult";

describe("ToolResult 컴포넌트", () => {
	const baseToolCall = {
		id: "tool-1",
		name: "get_weather",
		input: { city: "서울" },
		status: "pending" as const,
	};

	it("도구 이름 레이블을 렌더링한다", () => {
		render(<ToolResult toolCall={{ ...baseToolCall, status: "success" }} />);
		expect(screen.getByText(/날씨 조회/)).toBeDefined();
	});

	it("실행 중 상태에서 스피너 텍스트를 표시한다", () => {
		render(<ToolResult toolCall={{ ...baseToolCall, status: "running" }} />);
		expect(screen.getByText(/중\.\.\./)).toBeDefined();
	});

	it("성공 상태에서 결과를 표시한다", () => {
		render(
			<ToolResult
				toolCall={{
					...baseToolCall,
					status: "success",
					result: "맑음, 15도",
				}}
			/>,
		);
		expect(screen.getByText(/완료/)).toBeDefined();
		expect(screen.getByText("맑음, 15도")).toBeDefined();
	});

	it("에러 상태에서 에러 메시지를 표시한다", () => {
		render(<ToolResult toolCall={{ ...baseToolCall, status: "error" }} />);
		expect(screen.getAllByText(/실패/).length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText(/도구 실행에 실패했습니다/)).toBeDefined();
	});

	it("에러 상태에서 도구 결과가 있으면 실패 원인을 표시한다", () => {
		render(
			<ToolResult
				toolCall={{
					...baseToolCall,
					status: "error",
					result: "Error: City not found: 없는도시",
				}}
			/>,
		);

		expect(screen.getByText("Error: City not found: 없는도시")).toBeDefined();
	});

	it("미등록 도구에 폴백 아이콘을 렌더링한다", () => {
		render(
			<ToolResult
				toolCall={{
					...baseToolCall,
					name: "unknown_tool",
					status: "success",
				}}
			/>,
		);
		expect(screen.getByText("[?]")).toBeDefined();
	});

	it("시간 도구 이름을 읽기 쉬운 레이블로 렌더링한다", () => {
		render(
			<ToolResult
				toolCall={{
					...baseToolCall,
					name: "get_current_time",
					status: "success",
				}}
			/>,
		);
		expect(screen.getByText("현재 시간 확인")).toBeDefined();
	});
});
