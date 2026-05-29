import { useEffect, useRef } from "react";
import type { Message } from "../../types";
import { MessageItem } from "./MessageItem";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageListProps {
	messages: Message[];
	isLoading?: boolean;
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isLoading]);

	const lastMessage = messages[messages.length - 1];
	const showTypingIndicator =
		isLoading && (!lastMessage || (lastMessage.role === "assistant" && lastMessage.content === ""));

	return (
		<ScrollArea className="flex-1">
			<div className="flex flex-col gap-3 p-4">
				{messages.map((message) => (
					<MessageItem key={message.id} message={message} />
				))}
				{showTypingIndicator && (
					<article className="flex flex-col items-start gap-1">
						<div className="flex items-center gap-1.5">
							<span className="text-base leading-none select-none" aria-hidden>🤖</span>
							<span className="text-xs font-medium text-muted-foreground">AI 어시스턴트</span>
						</div>
						<div className="rounded-block bg-secondary px-4 py-3">
							<span className="flex items-center gap-1" role="status" aria-label="응답 생성 중">
								<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
								<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
								<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
							</span>
						</div>
					</article>
				)}
				<div ref={bottomRef} />
			</div>
		</ScrollArea>
	);
}
