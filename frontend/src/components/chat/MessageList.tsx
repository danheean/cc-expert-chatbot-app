import { useEffect, useRef } from "react";
import type { Message } from "../../types";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
	messages: Message[];
	isLoading?: boolean;
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isLoading]);

	if (messages.length === 0 && !isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center text-gray-400">
				대화를 시작해보세요
			</div>
		);
	}

	return (
		<div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
			{messages.map((message) => (
				<MessageItem key={message.id} message={message} />
			))}
			{isLoading && (
				<div className="text-gray-400">응답 생성 중...</div>
			)}
			<div ref={bottomRef} />
		</div>
	);
}
