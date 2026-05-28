import { ToolOrchestrator } from "../../src/services/toolOrchestrator";
import { getCurrentTimeTool } from "../../src/tools/getCurrentTime";
import { calculatorTool } from "../../src/tools/calculator";

describe("ToolOrchestrator", () => {
	let orchestrator: ToolOrchestrator;

	beforeEach(() => {
		orchestrator = new ToolOrchestrator([getCurrentTimeTool, calculatorTool]);
	});

	describe("도구 등록", () => {
		it("도구를 등록한다", () => {
			const tools = orchestrator.getToolDefinitions();
			expect(tools).toHaveLength(2);
		});

		it("이름으로 도구를 찾는다", () => {
			const tool = orchestrator.getTool("calculator");
			expect(tool).toBeDefined();
			expect(tool?.definition.toolSpec.name).toBe("calculator");
		});
	});

	describe("단일 도구 실행", () => {
		it("단일 도구를 실행한다", async () => {
			const result = await orchestrator.executeSingle({
				toolUseId: "test-1",
				name: "calculator",
				input: { expression: "2 + 3" },
			});

			expect(result.toolUseId).toBe("test-1");
			expect(result.content).toBe("5");
			expect(result.status).toBe("success");
		});

		it("도구 실행 에러를 처리한다", async () => {
			const result = await orchestrator.executeSingle({
				toolUseId: "test-2",
				name: "calculator",
				input: { expression: "10 / 0" },
			});

			expect(result.status).toBe("error");
			expect(result.content).toContain("Error");
		});

		it("알 수 없는 도구를 처리한다", async () => {
			const result = await orchestrator.executeSingle({
				toolUseId: "test-3",
				name: "unknown_tool",
				input: {},
			});

			expect(result.status).toBe("error");
			expect(result.content).toContain("Unknown tool");
		});
	});
	describe("다중 도구 실행", () => {
		it("여러 도구를 병렬로 실행한다", async () => {
			const toolCalls = [
				{
					toolUseId: "call-1",
					name: "calculator",
					input: { expression: "2 + 3" },
				},
				{
					toolUseId: "call-2",
					name: "calculator",
					input: { expression: "4 * 5" },
				},
			];

			const results = await orchestrator.executeMultiple(toolCalls);

			expect(results).toHaveLength(2);
			expect(results.find((r) => r.toolUseId === "call-1")?.content).toBe("5");
			expect(results.find((r) => r.toolUseId === "call-2")?.content).toBe("20");
		});

		it("성공과 실패가 혼재된 경우를 처리한다", async () => {
			const toolCalls = [
				{
					toolUseId: "call-1",
					name: "calculator",
					input: { expression: "2 + 3" },
				},
				{
					toolUseId: "call-2",
					name: "calculator",
					input: { expression: "10 / 0" },
				},
			];

			const results = await orchestrator.executeMultiple(toolCalls);

			expect(results).toHaveLength(2);
			expect(results.find((r) => r.toolUseId === "call-1")?.status).toBe(
				"success",
			);
			expect(results.find((r) => r.toolUseId === "call-2")?.status).toBe(
				"error",
			);
		});

		it("성능을 위해 병렬로 실행한다", async () => {
			// 시간 측정을 위한 느린 도구 시뮬레이션
			const slowTool = {
				definition: {
					toolSpec: {
						name: "slow_tool",
						description: "Slow tool for testing",
						inputSchema: { json: { type: "object" as const, properties: {} } },
					},
				},
				execute: async () => {
					await new Promise((resolve) => setTimeout(resolve, 100));
					return "done";
				},
			};

			const testOrchestrator = new ToolOrchestrator([slowTool, slowTool]);

			const start = Date.now();
			await testOrchestrator.executeMultiple([
				{ toolUseId: "1", name: "slow_tool", input: {} },
				{ toolUseId: "2", name: "slow_tool", input: {} },
				{ toolUseId: "3", name: "slow_tool", input: {} },
			]);
			const duration = Date.now() - start;

			// 병렬 실행이면 300ms 미만이어야 함 (순차면 300ms 이상)
			expect(duration).toBeLessThan(200);
		});
	});
});

