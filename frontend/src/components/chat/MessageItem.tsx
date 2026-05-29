import type { Message, ToolCall } from "../../types";
import { ToolResult } from "./ToolResult";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { cn } from "@/lib/utils";

interface MessageItemProps {
	message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
	const isUser = message.role === "user";
	const timeStr = message.timestamp.toLocaleTimeString("ko-KR", {
		hour: "2-digit",
		minute: "2-digit",
	});

	return (
		<article
			className={cn(
				"flex gap-3 px-4 py-2 rounded-md transition-colors hover:bg-muted/40",
				isUser ? "flex-row-reverse" : "flex-row",
			)}
		>
			<div
				className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center select-none"
				aria-hidden
			>
				<span className="text-base leading-none">{isUser ? "🙂" : "🤖"}</span>
			</div>

			<div className="flex-1 flex flex-col gap-0.5 min-w-0">
				<div className={cn("flex items-baseline gap-2", isUser && "justify-end")}>
					<span className="text-sm font-semibold">
						{isUser ? "주레피" : "AI 어시스턴트"}
					</span>
					<span className="text-xs text-muted-foreground">{timeStr}</span>
				</div>

				<div className={cn("text-sm leading-relaxed", isUser && "text-right")}>
					{isUser ? (
						<p className="whitespace-pre-wrap">{message.content}</p>
					) : (
						<MarkdownRenderer content={message.content} />
					)}
				</div>

				{message.toolCalls?.map((tc: ToolCall) => (
					<ToolResult key={tc.id} toolCall={tc} />
				))}
			</div>
		</article>
	);
}
