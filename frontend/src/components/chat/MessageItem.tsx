import type { Message, ToolCall } from "../../types";
import { ToolResult } from "./ToolResult";

interface MessageItemProps {
	message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
	return (
		<article>
			<div
				className={
					message.role === "user" ? "bg-primary" : "bg-secondary"
				}
			>
				{message.content}
			</div>
			{message.toolCalls?.map((tc: ToolCall) => (
				<ToolResult key={tc.id} toolCall={tc} />
			))}
		</article>
	);
}
