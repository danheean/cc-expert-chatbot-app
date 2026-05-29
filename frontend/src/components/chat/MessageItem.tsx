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
		<article className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
			<div className={cn("flex items-center gap-1.5", isUser && "flex-row-reverse")}>
				<span className="text-base leading-none select-none" aria-hidden>
					{isUser ? "🙂" : "🤖"}
				</span>
				<span className="text-xs font-semibold text-foreground">
					{isUser ? "주레피" : "AI 어시스턴트"}
				</span>
				<span className="text-xs text-muted-foreground">
					{message.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
				</span>
			</div>
			<div
				className={cn(
					"max-w-[75%] rounded-block px-4 py-2.5 text-sm",
					isUser
						? "bg-[#FEE500] text-[#1a1a1a]"
						: "bg-secondary text-secondary-foreground ring-1 ring-border",
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
