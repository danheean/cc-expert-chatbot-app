import { executeWithFallback } from "../../src/utils/fallback";
import type { Tool } from "../../src/types/tool";

// 테스트용 모킹 도구 생성 헬퍼
function createMockTool(
	executeFn: (input: Record<string, unknown>) => Promise<string>,
): Tool {
	return {
		definition: {
			toolSpec: {
				name: "test_tool",
				description: "Test",
				inputSchema: { json: { type: "object", properties: {} } },
			},
		},
		execute: executeFn,
	};
}
const failingTool = createMockTool(() => {
	throw new Error("Failed");
});

describe("executeWithFallback", () => {
	it("실패 시 재시도하여 성공한다", async () => {
		let attempts = 0;
		const tool = createMockTool(() => {
			attempts++;
			if (attempts < 3) throw new Error("Temporary error");
			return Promise.resolve("success after retry");
		});

		const result = await executeWithFallback(
			tool,
			{},
			{ type: "retry", retryCount: 3 },
		);
		expect(result.status).toBe("success");
		expect(result.content).toBe("success after retry");
	});

	it("실패 시 기본값을 반환한다", async () => {
		const result = await executeWithFallback(
			failingTool,
			{},
			{ type: "default", defaultValue: "기본 응답입니다." },
		);
		expect(result.content).toBe("기본 응답입니다.");
	});

	it("실패 시 빈 내용을 반환한다", async () => {
		const result = await executeWithFallback(failingTool, {}, { type: "skip" });
		expect(result.content).toBe("");
	});
});

