# AI 챗봇 프로젝트

## 프로젝트 개요
vLLM gemma모델을 사용하는 웹 기반 AI 챗봇 애플리케이션

## 기술 스택
- Frontend: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Node.js + Express + TypeScript
- AI: vLLM(https://vllm.repia.com/, key:aimates, google/gemma-3-12b-it)
- API: Converse API with ConverseStream
- Streaming: Server-Sent Events (SSE)

## 디자인 시스템
- 디자인 시스템 명세: `docs/DESIGN-FIGMA.md`
- UI 컴포넌트: shadcn/ui (Tailwind CSS v3 기반)
- 폰트: Inter (figmaSans 대체), JetBrains Mono (figmaMono 대체)
- 색상 토큰: `frontend/tailwind.config.js` 및 `frontend/src/index.css` CSS 변수 참조
- 핵심 규칙:
  - 모든 버튼은 pill 형태 (`rounded-pill` = 50px) 사용
  - primary 버튼: 검정 배경 + 흰 텍스트
  - 컬러블록 섹션: `block-lime`, `block-lilac` 등 파스텔 팔레트 사용
  - 새 UI 컴포넌트 작성 시 파일 상단에 `docs/DESIGN-FIGMA.md` 참조 주석 기재

## 프로젝트 구조
chatbot/
├── frontend/ # React 클라이언트
├── backend/ # Express 서버
└── CLAUDE.md

## 코딩 컨벤션

### 테스트
- TDD 방식으로 개발: 테스트 먼저 작성
- 테스트 파일: *.test.ts
- 테스트 프레임워크: Jest

### 타입스크립트
- 명시적 타입 선언 사용
- any 타입 사용 금지
- interface 우선 사용 (type은 유니온/인터섹션에만)

### 에러 처리
- 커스텀 에러 클래스 사용
- 에러 메시지는 사용자 친화적으로

### 네이밍
- 변수/함수: camelCase
- 클래스/인터페이스: PascalCase
- 상수: UPPER_SNAKE_CASE
- 파일: kebab-case

## 구현하지 않을 것 (Scope 외)
다음 기능은 이번 프로젝트 범위에 포함되지 않습니다.
관련 코드를 생성하지 마세요.

- 사용자 인증/인가 (로그인, 회원가입)
- 데이터베이스 연동 (세션 기반 메모리 저장 사용)
- 파일 업로드
- 이미지/음성 입력 (멀티모달)
- RAG (검색 증강 생성)

## vLLM 설정
- url: https://vllm.repia.com
- 모델 ID: google/gemma-3-12b-it
- key: aimates

## 설계 결정 사항
- 아키텍처: 3-tier (React → Express → vLLM)
- 스트리밍 방식: SSE (Server-Sent Events)
- 세션 저장: 인메모리 (데이터베이스 미사용)
- API 스타일: RESTful + SSE 스트리밍
- 에러 메시지: 사용자 응답은 한국어, 내부 로그는 영어

테스트 코드가 명세 역할을 합니다.
테스트 파일을 참조하여 구현 코드를 생성하세요.