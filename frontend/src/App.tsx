import { useCallback } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Layout } from "./components/layout/Layout";
import { useSession } from "./hooks/useSession";
import { useChat } from "./hooks/useChat";
import { useTheme } from "./hooks/useTheme";

function App() {
  const { sessions, currentSession, createSession, selectSession, deleteSession } =
    useSession();
  const { messages, isLoading, error, sendMessage: originalSendMessage } = useChat(
    currentSession?.id ?? "",
  );
  const { theme, toggleTheme } = useTheme();

  const handleSendMessage = useCallback(
    (message: string) => {
      if (!currentSession) {
        const newSession = createSession();
        originalSendMessage(message, newSession.id);
      } else {
        originalSendMessage(message);
      }
    },
    [currentSession, createSession, originalSendMessage],
  );

  return (
    <ErrorBoundary>
      <Layout
        sessions={sessions}
        currentSession={currentSession}
        messages={messages}
        isLoading={isLoading}
        error={error}
        onSendMessage={handleSendMessage}
        onSelectSession={selectSession}
        onNewChat={createSession}
        onDeleteSession={deleteSession}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    </ErrorBoundary>
  );
}

export default App;
