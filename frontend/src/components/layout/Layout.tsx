import { useState, useEffect } from "react";
import type { Message, Session } from "../../types";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MessageList } from "../chat/MessageList";
import { MessageInput } from "../chat/MessageInput";
import { ErrorMessage } from "../ErrorMessage";

interface LayoutProps {
	sessions: Session[];
	currentSession: Session | null;
	messages: Message[];
	isLoading: boolean;
	error: string | null;
	onSendMessage: (message: string) => void;
	onSelectSession: (id: string) => void;
	onNewChat: () => void;
	onDeleteSession: (id: string) => void;
}

export function Layout({
	sessions,
	currentSession,
	messages,
	isLoading,
	error,
	onSendMessage,
	onSelectSession,
	onNewChat,
	onDeleteSession,
}: LayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [errorDismissed, setErrorDismissed] = useState(false);

	useEffect(() => {
		setErrorDismissed(false);
	}, [error]);

	const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");

	const handleRetry = () => {
		setErrorDismissed(true);
		if (lastUserMessage) {
			onSendMessage(lastUserMessage.content);
		}
	};

	return (
		<div className="flex h-screen flex-col overflow-hidden">
			<Header
				onMenuClick={() => setSidebarOpen((prev) => !prev)}
				sessionTitle={currentSession?.title}
			/>

			<div className="relative flex flex-1 overflow-hidden">
				{/* Mobile overlay */}
				{sidebarOpen && (
					<div
						className="absolute inset-0 z-10 bg-black/30 md:hidden"
						onClick={() => setSidebarOpen(false)}
					/>
				)}

				{/* Sidebar */}
				<div
					className={`absolute inset-y-0 left-0 z-20 transition-transform md:relative md:translate-x-0 ${
						sidebarOpen ? "translate-x-0" : "-translate-x-full"
					} md:block`}
				>
					<Sidebar
						sessions={sessions}
						currentSessionId={currentSession?.id}
						onNewChat={() => {
							onNewChat();
							setSidebarOpen(false);
						}}
						onSelectSession={(id) => {
							onSelectSession(id);
							setSidebarOpen(false);
						}}
						onDeleteSession={onDeleteSession}
					/>
				</div>

				{/* Main chat area */}
				<div className="flex flex-1 flex-col overflow-hidden">
					{error && !errorDismissed && (
						<div className="shrink-0 p-3">
							<ErrorMessage
								message={error}
								onDismiss={() => setErrorDismissed(true)}
								onRetry={lastUserMessage ? handleRetry : undefined}
							/>
						</div>
					)}
					<MessageList messages={messages} isLoading={isLoading} />
					<MessageInput onSend={onSendMessage} isLoading={isLoading} />
				</div>
			</div>
		</div>
	);
}
