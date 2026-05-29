export interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	toolCalls?: ToolCall[];
	timestamp: Date;
}

export interface ToolCall {
	id: string;
	name: string;
	input: Record<string, unknown>;
	status: "pending" | "running" | "success" | "completed" | "error";
	result?: string;
}

export interface Session {
	id: string;
	title: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface ChatState {
	messages: Message[];
	isLoading: boolean;
	error: string | null;
	currentToolCalls: ToolCall[];
}

