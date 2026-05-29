import type { Tool } from "../types/tool";

type FallbackOption =
	| { type: "retry"; retryCount: number }
	| { type: "default"; defaultValue: string }
	| { type: "skip" }
	| { type: "error" };

interface FallbackResult {
	content: string;
	status?: "success" | "error";
}

export async function executeWithFallback(
	tool: Tool,
	input: Record<string, unknown>,
	fallback: FallbackOption,
): Promise<FallbackResult> {
	switch (fallback.type) {
		case "retry": {
			let lastError: unknown;
			for (let i = 0; i < fallback.retryCount; i++) {
				try {
					const content = await tool.execute(input);
					return { content, status: "success" };
				} catch (err) {
					lastError = err;
				}
			}
			const message =
				lastError instanceof Error ? lastError.message : String(lastError);
			return { content: message, status: "error" };
		}

		case "default": {
			try {
				const content = await tool.execute(input);
				return { content, status: "success" };
			} catch {
				return { content: fallback.defaultValue, status: "error" };
			}
		}

		case "skip": {
			try {
				const content = await tool.execute(input);
				return { content, status: "success" };
			} catch {
				return { content: "", status: "error" };
			}
		}

		case "error": {
			const content = await tool.execute(input);
			return { content, status: "success" };
		}
	}
}
