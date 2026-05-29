import { executeWithPermissionCheck } from "../../src/utils/permission";
import type { Tool } from "../../src/types/tool";

const mockTool: Tool = {
	definition: {
		toolSpec: {
			name: "get_weather",
			description: "날씨 조회",
			inputSchema: {
				json: {
					type: "object",
					properties: {
						city: { type: "string", description: "도시명" },
					},
					required: ["city"],
				},
			},
		},
	},
	execute: async () => "맑음, 15도",
};

describe("executeWithPermissionCheck", () => {
	it("권한이 부여되면 도구를 실행한다", async () => {
		const context = { userId: "user-1", permissions: ["tool:get_weather"] };
		const result = await executeWithPermissionCheck(
			mockTool,
			{ city: "서울" },
			context,
		);
		expect(result).toBe("맑음, 15도");
	});

	it("권한이 거부되면 에러를 던진다", async () => {
		const context = { userId: "user-1", permissions: [] };
		await expect(
			executeWithPermissionCheck(mockTool, { city: "서울" }, context),
		).rejects.toThrow("Permission denied");
	});
});

