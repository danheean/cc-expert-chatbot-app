import { v4 as uuidv4 } from "uuid";
import { Session, CreateSessionRequest, UpdateSessionRequest } from "../types";

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  create(options: CreateSessionRequest = {}): Session {
    const now = new Date();
    const session: Session = {
      id: options.id ?? uuidv4(),
      title: options.title ?? "New Chat",
      createdAt: now,
      updatedAt: now,
      ...(options.metadata !== undefined && { metadata: options.metadata }),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  getAll(): Session[] {
    return Array.from(this.sessions.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  update(id: string, changes: UpdateSessionRequest): Session | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updated: Session = {
      ...session,
      ...(changes.title !== undefined && { title: changes.title }),
      ...(changes.metadata !== undefined && { metadata: changes.metadata }),
      updatedAt: new Date(),
    };

    this.sessions.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.sessions.delete(id);
  }
}

export const sessionManager = new SessionManager();
