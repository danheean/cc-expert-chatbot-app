import type { Tool, ToolDefinition, ToolResult } from "../types/tool";

interface ToolCall {
	toolUseId: string;
	name: string;
	input: Record<string, unknown>;
}

export class ToolOrchestrator {
	private readonly toolMap: Map<string, Tool>;

	constructor(tools: Tool[]) {
		this.toolMap = new Map(
			tools.map((t) => [t.definition.toolSpec.name, t]),
		);
	}

	getToolDefinitions(): ToolDefinition[] {
		return Array.from(this.toolMap.values()).map((t) => t.definition);
	}

	getTool(name: string): Tool | undefined {
		return this.toolMap.get(name);
	}

	async executeSingle(call: ToolCall): Promise<ToolResult> {
		const tool = this.toolMap.get(call.name);

		if (!tool) {
			return {
				toolUseId: call.toolUseId,
				content: `Unknown tool: ${call.name}`,
				status: "error",
			};
		}

		try {
			const content = await tool.execute(call.input);
			return { toolUseId: call.toolUseId, content, status: "success" };
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			return {
				toolUseId: call.toolUseId,
				content: `Error: ${message}`,
				status: "error",
			};
		}
	}

	async executeMultiple(calls: ToolCall[]): Promise<ToolResult[]> {
		return Promise.all(calls.map((call) => this.executeSingle(call)));
	}
}
