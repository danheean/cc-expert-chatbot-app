import { useState, useEffect } from "react";
import type { Session } from "../types";

const STORAGE_KEY = "chatbot-sessions";

function loadFromStorage(): Session[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw) as Session[];
	} catch {
		return [];
	}
}

function generateId(): string {
	if (typeof crypto !== "undefined" && crypto.randomUUID) {
		return crypto.randomUUID();
	}
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useSession() {
	const [sessions, setSessions] = useState<Session[]>(() => loadFromStorage());
	const [currentSession, setCurrentSession] = useState<Session | null>(null);

	// 마운트 시 기존 세션을 백엔드에 동기화
	useEffect(() => {
		const initial = loadFromStorage();
		initial.forEach((session) => {
			fetch("/api/sessions", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ id: session.id, title: session.title }),
			}).catch(() => {});
		});
	}, []);

	// 세션 변경 시 localStorage에 저장
	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
	}, [sessions]);

	const createSession = (): Session => {
		const now = new Date();
		const session: Session = {
			id: generateId(),
			title: `새 대화 ${sessions.length + 1}`,
			createdAt: now,
			updatedAt: now,
		};
		setSessions((prev) => [...prev, session]);
		setCurrentSession(session);
		fetch("/api/sessions", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ id: session.id, title: session.title }),
		}).catch(() => {});
		return session;
	};

	const deleteSession = (id: string) => {
		const updated = sessions.filter((s) => s.id !== id);
		setSessions(updated);
		setCurrentSession((current) => {
			if (current?.id !== id) return current;
			return updated[updated.length - 1] ?? null;
		});
		fetch(`/api/sessions/${id}`, { method: "DELETE" }).catch(() => {});
	};

	const selectSession = (id: string) => {
		const session = sessions.find((s) => s.id === id);
		if (session) setCurrentSession(session);
	};

	const renameSession = (id: string, title: string) => {
		const trimmed = title.trim();
		if (!trimmed) return;
		const updatedAt = new Date();
		setSessions((prev) =>
			prev.map((s) => (s.id === id ? { ...s, title: trimmed, updatedAt } : s)),
		);
		setCurrentSession((prev) =>
			prev?.id === id ? { ...prev, title: trimmed, updatedAt } : prev,
		);
		fetch(`/api/sessions/${id}`, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ title: trimmed }),
		}).catch(() => {});
	};

	return { sessions, currentSession, createSession, deleteSession, selectSession, renameSession };
}
