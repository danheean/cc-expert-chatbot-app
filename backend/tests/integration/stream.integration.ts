import dotenv from "dotenv";
import { VllmService } from "../../src/services/vllm";

dotenv.config();

async function main() {
  const service = new VllmService();
  const modelId =
    process.env.VLLM_MODEL_ID ?? "meta-llama/Llama-3.1-8B-Instruct";
  console.log(`모델 ID: ${modelId}`);
  console.log("스트리밍 시작...\n");

  process.stdout.write("응답: ");

  let inputTokens = 0;
  let outputTokens = 0;

  for await (const event of service.chatStream({
    messages: [
      {
        role: "user",
        content: [{ text: "안녕? 너는 누구야? 간단히 소개해줘." }],
      },
    ],
  })) {
    if (event.type === "text_delta" && event.text) {
      process.stdout.write(event.text);
    } else if (event.type === "message_complete" && event.usage) {
      inputTokens = event.usage.inputTokens;
      outputTokens = event.usage.outputTokens;
    }
  }

  console.log("\n\n토큰 사용량:");
  console.log(` - 입력: ${inputTokens}`);
  console.log(` - 출력: ${outputTokens}`);
}

main().catch(console.error);
