import dotenv from "dotenv";
import { VllmService } from "../../src/services/vllm";

dotenv.config();

async function main() {
  const service = new VllmService();
  const modelId =
    process.env.VLLM_MODEL_ID ?? "meta-llama/Llama-3.1-8B-Instruct";
  console.log(`모델 ID: ${modelId}`);
  console.log("메시지 전송 중...\n");

  const response = await service.chat({
    messages: [
      {
        role: "user",
        content: [{ text: "안녕? 너는 누구야? 간단히 소개해줘." }],
      },
    ],
  });

  console.log(`응답: ${response.content[0]?.text}\n`);
  console.log("토큰 사용량:");
  console.log(` - 입력: ${response.usage.inputTokens}`);
  console.log(` - 출력: ${response.usage.outputTokens}`);
  console.log(` - 종료 사유: ${response.stopReason}`);
}

main().catch(console.error);
