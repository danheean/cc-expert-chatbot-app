import type { Message, ToolCall } from "../../types";
import { ToolResult } from "./ToolResult";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn } from "@/lib/utils";

interface MessageItemProps {
	message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
	const isUser = message.role === "user";

	return (
		<article className={cn("flex flex-col gap-2", isUser ? "items-end" : "items-start")}>
			<div
				className={cn(
					"max-w-[80%] rounded-block px-4 py-2.5 text-sm",
					isUser
						? "bg-primary text-primary-foreground"
						: "bg-secondary text-secondary-foreground",
				)}
			>
				{isUser ? (
					<p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
				) : (
					<MarkdownRenderer content={message.content} />
				)}
			</div>
			{message.toolCalls?.map((tc: ToolCall) => (
				<ToolResult key={tc.id} toolCall={tc} />
			))}
		</article>
	);
}
