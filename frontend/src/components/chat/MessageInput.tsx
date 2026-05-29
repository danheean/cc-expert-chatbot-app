/**
 * MessageInput — docs/DESIGN-FIGMA.md > Components > Buttons, Inputs & Forms
 *
 * Button : pill 형태 primary ({rounded.pill} = 50px, black bg)
 * Textarea: {rounded.md} = 8px, {colors.hairline} border
 */
import { useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";

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
    <div className="flex items-end gap-2 border-t border-hairline p-3">
      <Textarea
        placeholder="메시지를 입력하세요"
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        className="flex-1 resize-none"
      />
      <Button onClick={handleSend} disabled={isLoading} aria-label="전송">
        <SendHorizontal className="h-4 w-4" />
        <span className="sr-only">전송</span>
      </Button>
    </div>
  );
}
