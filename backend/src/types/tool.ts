export interface ToolDefinition {
	toolSpec: {
		name: string;
		description: string;
		inputSchema: {
			json: JsonSchema;
		};
	};
}

export interface JsonSchema {
	type: "object";
	properties: Record<string, PropertySchema>;
	required?: string[];
}

export interface PropertySchema {
	type: "string" | "number" | "boolean" | "array" | "object";
	description: string;
	enum?: string[];
	items?: PropertySchema;
}

export interface ToolResult {
	toolUseId: string;
	content: string;
	status?: "success" | "error";
}

export interface Tool {
	definition: ToolDefinition;
	execute: (input: Record<string, unknown>) => Promise<string>;
}

