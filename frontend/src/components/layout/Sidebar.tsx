/**
 * Sidebar — docs/DESIGN-FIGMA.md > Components > Buttons
 *
 * 새 대화: button-primary ({rounded.pill}, black bg)
 * 세션 항목: ghost button, rounded-md, bg-accent when active
 * 삭제/수정: ghost icon button (circular)
 * 목록: shadcn ScrollArea
 */
import { useState } from "react";
import type { Session } from "../../types";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pencil, X } from "lucide-react";

interface SidebarProps {
	sessions: Session[];
	currentSessionId?: string;
	onNewChat: () => void;
	onSelectSession: (id: string) => void;
	onDeleteSession: (id: string) => void;
	onRenameSession: (id: string, title: string) => void;
}

export function Sidebar({
	sessions,
	currentSessionId,
	onNewChat,
	onSelectSession,
	onDeleteSession,
	onRenameSession,
}: SidebarProps) {
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editingTitle, setEditingTitle] = useState("");

	const startEditing = (session: Session) => {
		setEditingId(session.id);
		setEditingTitle(session.title);
	};

	const commitEdit = () => {
		if (editingId) {
			onRenameSession(editingId, editingTitle);
		}
		setEditingId(null);
	};

	const cancelEdit = () => {
		setEditingId(null);
	};

	return (
		<aside className="flex h-full w-64 flex-col border-r bg-background shadow-xl md:shadow-none">
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
							<div key={session.id} className="group flex items-center gap-1">
								{editingId === session.id ? (
									<input
										autoFocus
										value={editingTitle}
										onChange={(e) => setEditingTitle(e.target.value)}
										onFocus={(e) => e.target.select()}
										onBlur={commitEdit}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												commitEdit();
											} else if (e.key === "Escape") {
												cancelEdit();
											}
										}}
										className="flex-1 truncate rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
									/>
								) : (
									<button
										type="button"
										onClick={() => onSelectSession(session.id)}
										className={`flex-1 truncate rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${
											session.id === currentSessionId ? "bg-accent font-medium" : ""
										}`}
									>
										{session.title}
									</button>
								)}

								{editingId !== session.id && (
									<>
										<Button
											variant="ghost"
											size="icon"
											aria-label="세션 이름 수정"
											onClick={() => startEditing(session)}
											className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 hover:text-foreground group-hover:opacity-100"
										>
											<Pencil className="h-3.5 w-3.5" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											aria-label="세션 삭제"
											onClick={() => onDeleteSession(session.id)}
											className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
										>
											<X className="h-4 w-4" />
										</Button>
									</>
								)}
							</div>
						))
					)}
				</nav>
			</ScrollArea>
		</aside>
	);
}
