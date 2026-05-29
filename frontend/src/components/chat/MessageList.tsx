import { useEffect, useRef } from "react";
import type { Message, ToolCall } from "../../types";

const TOOL_NAME_MAP: Record<string, string> = {
	get_weather: "날씨 조회",
	calculator: "계산기",
	get_current_time: "현재 시간",
};

function ToolResult({ toolCall }: { toolCall: ToolCall }) {
	const displayName = TOOL_NAME_MAP[toolCall.name] ?? toolCall.name;
	return (
		<div className="tool-result mt-1 rounded bg-gray-100 p-2 text-sm">
			<span className="font-medium">{displayName}</span>
			{toolCall.result && (
				<p className="mt-1 text-gray-600">{toolCall.result}</p>
			)}
		</div>
	);
}

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
				<article key={message.id}>
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
			))}
			{isLoading && (
				<div className="text-gray-400">응답 생성 중...</div>
			)}
			<div ref={bottomRef} />
		</div>
	);
}
