import { useState, type KeyboardEvent } from "react";

interface MessageInputProps {
	onSend: (message: string) => void;
	isLoading?: boolean;
}

export function MessageInput({ onSend, isLoading = false }: MessageInputProps) {
	const [value, setValue] = useState("");

	const handleSend = () => {
		const trimmed = value.trim();
		if (!trimmed) return;
		onSend(trimmed);
		setValue("");
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="flex items-end gap-2 border-t p-3">
			<textarea
				className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
				placeholder="메시지를 입력하세요"
				rows={1}
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				disabled={isLoading}
			/>
			<button
				type="button"
				className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
				onClick={handleSend}
				disabled={isLoading}
			>
				전송
			</button>
		</div>
	);
}
