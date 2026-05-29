/**
 * Sidebar — docs/DESIGN-FIGMA.md > Components > Buttons
 *
 * 새 대화: button-primary ({rounded.pill}, black bg)
 * 세션 항목: ghost button, rounded-md, bg-accent when active
 * 삭제: ghost icon button (circular)
 * 목록: shadcn ScrollArea
 */
import type { Session } from "../../types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
		<aside className="flex w-64 flex-col border-r bg-background">
			<div className="p-3">
				<Button onClick={onNewChat} className="w-full">
					새 대화
				</Button>
			</div>

			<ScrollArea className="flex-1">
				<nav className="px-2 py-1">
					{sessions.length === 0 ? (
						<p className="py-4 text-center text-sm text-muted-foreground">대화 없음</p>
					) : (
						sessions.map((session) => (
							<div key={session.id} className="flex items-center gap-1">
								<button
									type="button"
									onClick={() => onSelectSession(session.id)}
									className={`flex-1 truncate rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${
										session.id === currentSessionId ? "bg-accent font-medium" : ""
									}`}
								>
									{session.title}
								</button>
								<Button
									variant="ghost"
									size="icon"
									aria-label="세션 삭제"
									onClick={() => onDeleteSession(session.id)}
									className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
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
								</Button>
							</div>
						))
					)}
				</nav>
			</ScrollArea>
		</aside>
	);
}
