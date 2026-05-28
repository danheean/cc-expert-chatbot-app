import dotenv from "dotenv";
import { VllmService } from "../../src/services/vllm";
import { ToolOrchestrator } from "../../src/services/toolOrchestrator";

dotenv.config();

const tools = [
  {
    definition: {
      type: "function" as const,
      function: {
        name: "get_current_time",
        description: "현재 날짜와 시간을 반환한다.",
        parameters: {
          type: "object",
          properties: {
            timezone: {
              type: "string",
              description: "시간대 (예: Asia/Seoul, UTC)",
            },
          },
          required: [],
        },
      },
    },
    execute: async (input: unknown) => {
      const tz = (input as { timezone?: string }).timezone ?? "Asia/Seoul";
      const now = new Date().toLocaleString("ko-KR", { timeZone: tz });
      console.log(`\n[Tool] get_current_time 실행 (timezone: ${tz}) → ${now}`);
      return now;
    },
  },
  {
    definition: {
      type: "function" as const,
      function: {
        name: "calculate",
        description: "두 수의 사칙연산을 수행한다.",
        parameters: {
          type: "object",
          properties: {
            a: { type: "number", description: "첫 번째 숫자" },
            b: { type: "number", description: "두 번째 숫자" },
            op: {
              type: "string",
              enum: ["add", "subtract", "multiply", "divide"],
              description: "연산 종류",
            },
          },
          required: ["a", "b", "op"],
        },
      },
    },
    execute: async (input: unknown) => {
      const { a, b, op } = input as { a: number; b: number; op: string };
      let result: number;
      switch (op) {
        case "add":      result = a + b; break;
        case "subtract": result = a - b; break;
        case "multiply": result = a * b; break;
        case "divide":   result = a / b; break;
        default: throw new Error(`Unknown op: ${op}`);
      }
      console.log(`\n[Tool] calculate(${a} ${op} ${b}) → ${result}`);
      return result;
    },
  },
];

async function run(question: string) {
  const service = new VllmService();
  const orchestrator = new ToolOrchestrator(tools);
  service.setToolOrchestrator(orchestrator);

  console.log(`\n질문: ${question}`);
  process.stdout.write("응답: ");

  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of service.chatStream({
    systemPrompt: "당신은 친절한 AI 어시스턴트입니다. 도구 실행 결과를 바탕으로 사용자에게 자연스럽고 완전한 문장으로 답변하세요.",
    messages: [{ role: "user", content: [{ text: question }] }],
  })) {
    switch (event.type) {
      case "tool_use_start":
        process.stdout.write(`\n[Tool 호출] ${event.toolName}`);
        break;
      case "tool_result":
        process.stdout.write(`\n[Tool 결과] ${event.toolResult}\n응답: `);
        break;
      case "text_delta":
        if (event.text) process.stdout.write(event.text);
        break;
      case "message_complete":
        if (event.usage) {
          inputTokens = event.usage.inputTokens;
          outputTokens = event.usage.outputTokens;
        }
        break;
    }
  }

  console.log(`\n\n토큰 사용량: 입력 ${inputTokens} / 출력 ${outputTokens}`);
}

async function main() {
  console.log(`모델 ID: ${process.env.VLLM_MODEL_ID}`);
  console.log("=".repeat(50));

  await run("지금 서울 시간이 몇 시야?");
  console.log("=".repeat(50));
  await run("137 곱하기 48은 얼마야?");
}

main().catch(console.error);
