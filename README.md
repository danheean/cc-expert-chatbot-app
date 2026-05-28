# AI 챗봇

vLLM 기반 웹 AI 챗봇 애플리케이션.

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React + TypeScript + Vite |
| Backend | Node.js + Express + TypeScript |
| AI | vLLM (OpenAI 호환 API) |
| 스트리밍 | Server-Sent Events (SSE) |

## 프로젝트 구조

```
cc-expert-chatbot-app/
├── backend/                        # Express API 서버
│   ├── src/
│   │   ├── services/
│   │   │   ├── vllm.ts             # VllmService (chat / chatStream)
│   │   │   └── toolOrchestrator.ts # Function calling 실행기
│   │   └── types/
│   │       └── index.ts            # 공유 타입 정의
│   └── tests/
│       ├── services/
│       │   └── vllm.test.ts        # 단위 테스트 (Jest)
│       └── integration/
│           ├── vllm.integration.ts         # 단일 응답 테스트
│           ├── vllm.stream.integration.ts  # 스트리밍 테스트
│           └── vllm.tooluse.integration.ts # Tool use 테스트
└── frontend/                       # React 클라이언트 (예정)
```

## 시작하기

### 환경 설정

```bash
cd backend
cp .env.example .env
```

`.env` 파일에 vLLM 서버 정보를 입력합니다:

```env
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_API_KEY=your-api-key
VLLM_MODEL_ID=meta-llama/Llama-3.1-8B-Instruct
```

### 의존성 설치

```bash
cd backend && npm install
```

## 테스트

### 단위 테스트

```bash
cd backend && npm test
```

### 통합 테스트

vLLM 서버가 실행 중이어야 합니다.

```bash
# 단일 응답
npx ts-node tests/integration/vllm.integration.ts

# 스트리밍
npx ts-node tests/integration/vllm.stream.integration.ts

# Tool use 스트리밍
npx ts-node tests/integration/vllm.tooluse.integration.ts
```

## VllmService API

### 단일 응답

```typescript
const service = new VllmService();
const response = await service.chat({
  messages: [{ role: "user", content: [{ text: "안녕?" }] }],
  systemPrompt: "친절한 AI 어시스턴트입니다.",
});
console.log(response.content[0].text);
```

### 스트리밍

```typescript
for await (const event of service.chatStream({ messages })) {
  if (event.type === "text_delta") process.stdout.write(event.text!);
  if (event.type === "message_complete") console.log(event.usage);
}
```

### Tool use

```typescript
const orchestrator = new ToolOrchestrator([
  {
    definition: {
      type: "function",
      function: {
        name: "get_current_time",
        description: "현재 시간을 반환한다.",
        parameters: { type: "object", properties: {} },
      },
    },
    execute: async () => new Date().toLocaleString("ko-KR"),
  },
]);

service.setToolOrchestrator(orchestrator);
```

## StreamEvent 타입

| type | 설명 | 주요 필드 |
|------|------|----------|
| `text_delta` | 텍스트 청크 | `text` |
| `tool_use_start` | tool 호출 시작 | `toolName`, `toolUseId` |
| `tool_result` | tool 실행 결과 | `toolResult` |
| `message_complete` | 스트림 종료 | `usage` |
| `error` | 에러 발생 | `error` |
