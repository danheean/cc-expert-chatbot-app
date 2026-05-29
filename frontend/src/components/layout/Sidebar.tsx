import type { Session } from "../../types";

interface SidebarProps {
	sessions: Session[];
	currentSessionId?: string;
	onNewChat: () => void;
	onSelectSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
}

export function Sidebar({
	sessions,
	currentSessionId,
	onNewChat,
	onSelectSession,
	onDeleteSession,
}: SidebarProps) {
	return (
		<aside className="flex w-64 flex-col border-r bg-white">
			<div className="p-3">
				<button
					type="button"
					onClick={onNewChat}
					className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					새 대화
				</button>
			</div>

			<nav className="flex-1 overflow-y-auto px-2">
				{sessions.length === 0 ? (
					<p className="py-4 text-center text-sm text-gray-400">대화 없음</p>
				) : (
					sessions.map((session) => (
						<div key={session.id} className="flex items-center gap-1">
							<button
								type="button"
								onClick={() => onSelectSession(session.id)}
								className={`flex-1 truncate rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 ${
									session.id === currentSessionId ? "bg-accent font-medium" : ""
								}`}
							>
								{session.title}
							</button>
							<button
								type="button"
								aria-label="세션 삭제"
								onClick={() => onDeleteSession(session.id)}
								className="shrink-0 rounded p-1 text-gray-400 hover:text-red-500"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									className="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
								>
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					))
				)}
			</nav>
		</aside>
	);
}
