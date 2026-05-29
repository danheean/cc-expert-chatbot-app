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
			<div className="flex flex-col gap-1 p-4">
				{messages.map((message) => (
					<MessageItem key={message.id} message={message} />
				))}
				{showTypingIndicator && (
					<article className="flex gap-3 px-4 py-2 rounded-md">
						<div
							className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center select-none"
							aria-hidden
						>
							<span className="text-base leading-none">🤖</span>
						</div>
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-semibold">AI 어시스턴트</span>
							<span className="flex items-center gap-1" role="status" aria-label="응답 생성 중">
								<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} aria-hidden />
								<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} aria-hidden />
								<span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} aria-hidden />
							</span>
						</div>
					</article>
				)}
				<div ref={bottomRef} />
			</div>
		</ScrollArea>
	);
}
