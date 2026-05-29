import { useState, useEffect } from "react";
import type { Message, Session } from "../../types";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MessageList } from "../chat/MessageList";
import { MessageInput } from "../chat/MessageInput";
import { WelcomeScreen } from "../chat/WelcomeScreen";
import { ErrorMessage } from "../ErrorMessage";
import { cn } from "@/lib/utils";
import type { Theme } from "@/hooks/useTheme";

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
	onRenameSession: (id: string, title: string) => void;
	theme?: Theme;
	onToggleTheme?: () => void;
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
	onRenameSession,
	theme,
	onToggleTheme,
}: LayoutProps) {
	const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
	const [errorDismissed, setErrorDismissed] = useState(false);

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 768) {
				setSidebarOpen(false);
			}
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

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
				theme={theme}
				onCycleTheme={onToggleTheme}
			/>

			<div className="relative flex flex-1 overflow-hidden">
				{/* 사이드바
				    모바일: absolute 오버레이, translate로 슬라이드 인/아웃
				    데스크톱: relative (레이아웃 공간 차지), 닫힐 때 hidden */}
				<div
					className={cn(
						"absolute inset-y-0 left-0 z-20 w-full transition-transform duration-200",
						sidebarOpen ? "translate-x-0" : "-translate-x-full",
						"md:relative md:inset-auto md:z-auto md:w-auto md:translate-x-0",
						!sidebarOpen && "md:hidden",
					)}
				>
					<Sidebar
						sessions={sessions}
						currentSessionId={currentSession?.id}
						onNewChat={() => {
							onNewChat();
							if (window.innerWidth < 768) setSidebarOpen(false);
						}}
						onSelectSession={(id) => {
							onSelectSession(id);
							if (window.innerWidth < 768) setSidebarOpen(false);
						}}
						onDeleteSession={onDeleteSession}
						onRenameSession={onRenameSession}
					/>
				</div>

				{/* 메인 채팅 영역 */}
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
					{messages.length === 0 && !isLoading ? (
						<WelcomeScreen onSendMessage={onSendMessage} />
					) : (
						<MessageList messages={messages} isLoading={isLoading} />
					)}
					<MessageInput onSend={onSendMessage} isLoading={isLoading} />
				</div>
			</div>
		</div>
	);
}
