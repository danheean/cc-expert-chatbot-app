import type { ToolCall } from "../../types";
import { Badge } from "@/components/ui/badge";

const TOOL_CONFIG: Record<string, { label: string; icon: string }> = {
  get_weather: { label: "날씨 조회", icon: "🌤" },
  web_search: { label: "웹 검색", icon: "🔍" },
  calculator: { label: "계산기", icon: "🔢" },
};

interface ToolResultProps {
  toolCall: ToolCall;
}

export function ToolResult({ toolCall }: ToolResultProps) {
  const config = TOOL_CONFIG[toolCall.name];
  const label = config?.label ?? toolCall.name;
  const icon = config ? config.icon : null;

  return (
    <div className="my-1 rounded-lg border bg-muted px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        {icon !== null ? (
          <span>{icon}</span>
        ) : (
          <span className="font-mono text-muted-foreground">[?]</span>
        )}
        <span className="font-medium text-foreground">{label}</span>
        {toolCall.status === "running" && (
          <Badge variant="secondary" className="ml-auto animate-pulse text-blue-500">
            실행 중...
          </Badge>
        )}
        {(toolCall.status === "success" || toolCall.status === "completed") && (
          <Badge variant="outline" className="ml-auto border-green-200 text-green-600">
            완료
          </Badge>
        )}
        {toolCall.status === "error" && (
          <Badge variant="destructive" className="ml-auto">
            실패
          </Badge>
        )}
      </div>

      {(toolCall.status === "success" || toolCall.status === "completed") && toolCall.result && (
        <p className="mt-1 text-muted-foreground">{toolCall.result}</p>
      )}

      {toolCall.status === "error" && (
        <p className="mt-1 text-destructive">도구 실행에 실패했습니다</p>
      )}
    </div>
  );
}
