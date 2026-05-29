import type { Tool } from "../types/tool";

interface PermissionContext {
	userId: string;
	permissions: string[];
}

export async function executeWithPermissionCheck(
	tool: Tool,
	input: Record<string, unknown>,
	context: PermissionContext,
): Promise<string> {
	const required = `tool:${tool.definition.toolSpec.name}`;
	if (!context.permissions.includes(required)) {
		throw new Error("Permission denied");
	}
	return tool.execute(input);
}
