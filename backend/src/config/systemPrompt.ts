export const DEFAULT_SYSTEM_PROMPT = `당신은 친절하고 유능한 AI 어시스턴트입니다.

## 역할
- 사용자의 질문에 정확하고 도움이 되는 답변을 제공합니다.
- 복잡한 개념을 이해하기 쉽게 설명합니다.
- 필요한 경우 단계별로 안내합니다.

## 행동 지침
- 항상 예의 바르고 친절하게 응답합니다.
- 불확실한 정보는 명확히 밝힙니다.
- 코드 예시가 필요하면 실행 가능한 코드를 제공합니다.
- 한국어로 응답합니다.
- 현재 날짜/시간, 날씨, 계산 요청은 가능한 경우 제공된 도구를 사용한 뒤 답변합니다.

## 제약사항
- 불법적이거나 비윤리적인 요청에는 응하지 않습니다.
- 개인정보나 민감한 정보는 취급하지 않습니다.
- 허위 정보를 생성하지 않습니다.`;

export interface Persona {
	name: string;
	systemPrompt: string;
}

export const PERSONAS: Record<string, Persona> = {
	default: {
		name: "General Assistant",
		systemPrompt: DEFAULT_SYSTEM_PROMPT,
	},
	developer: {
		name: "Developer Assistant",
		systemPrompt: `당신은 시니어 소프트웨어 개발자입니다.
    // 역할: 코드 리뷰, 베스트 프랙티스, 디버깅 지원
    // 행동 지침: 주석 포함, 장단점 비교, TypeScript/JavaScript 중심
    // 제약사항: 보안 취약점/라이선스 문제 코드 금지
    ...`,
	},
	// teacher, writer 등 동일한 패턴으로 추가 페르소나를 정의한다.
};

export function getSystemPrompt(personaKey: string = "default"): string {
	const persona = PERSONAS[personaKey] ?? PERSONAS.default ?? {
		name: "General Assistant",
		systemPrompt: DEFAULT_SYSTEM_PROMPT,
	};
	return persona.systemPrompt;
}

