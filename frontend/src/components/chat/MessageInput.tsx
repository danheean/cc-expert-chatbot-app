/**
 * MessageInput — docs/DESIGN-FIGMA.md > Components > Buttons, Inputs & Forms
 *
 * Textarea: {rounded.md} = 8px, {colors.hairline} border
 * Send button: 입력창 내부 우하단 (Claude Desktop 스타일)
 */
import { useState, useRef, type KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";

interface MessageInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
}

export function MessageInput({ onSend, isLoading = false }: MessageInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-hairline p-3">
      <div className="relative rounded-lg border border-hairline bg-background focus-within:ring-1 focus-within:ring-ring">
        <Textarea
          ref={textareaRef}
          placeholder="메시지를 입력하세요"
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="resize-none border-0 bg-transparent pr-12 focus-visible:ring-0 focus-visible:ring-offset-0"
          style={{ maxHeight: "160px", overflowY: "auto" }}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isLoading || !value.trim()}
          aria-label="전송"
          className="absolute bottom-2 right-2 rounded-full p-1.5 text-primary transition-opacity disabled:opacity-30 hover:bg-accent"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1.5 pl-1 text-xs text-muted-foreground">
        Shift+Enter로 줄바꿈
      </p>
    </div>
  );
}
