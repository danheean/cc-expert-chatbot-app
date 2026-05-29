import { render, screen } from "@testing-library/react";
import { MessageList } from "../../src/components/chat/MessageList";
import type { Message, ToolCall } from "../../src/types";

// JSDOM에는 scrollIntoView가 구현되어 있지 않으므로 mock 필요
beforeAll(() => {
	Element.prototype.scrollIntoView = () => {};
});

describe("MessageList", () => {
	const mockMessages: Message[] = [
		{
			id: "1",
			role: "user",
			content: "Hello",
			timestamp: new Date(),
		},
		{
			id: "2",
			role: "assistant",
			content: "Hi there!",
			timestamp: new Date(),
		},
	];

	it("전달된 모든 메시지를 렌더링한다", () => {
		render(<MessageList messages={mockMessages} />);

		expect(screen.getByText("Hello")).toBeInTheDocument();
		expect(screen.getByText("Hi there!")).toBeInTheDocument();
	});

	it("메시지가 없을 때 빈 상태를 표시한다", () => {
		render(<MessageList messages={[]} />);

		expect(screen.queryAllByRole("article")).toHaveLength(0);
	});

	it("사용자와 AI 메시지에 다른 스타일을 적용한다", () => {
		render(<MessageList messages={mockMessages} />);

		const userMessage = screen.getByText("Hello").closest("div");
		const assistantMessage = screen.getByText("Hi there!").closest("div");

		expect(userMessage).toHaveClass("bg-[#FEE500]");
		expect(assistantMessage).toHaveClass("bg-secondary");
	});

	it("메시지를 순서대로 렌더링한다", () => {
		render(<MessageList messages={mockMessages} />);

		const messages = screen.getAllByRole("article");
		expect(messages).toHaveLength(2);
		expect(messages[0]).toHaveTextContent("Hello");
		expect(messages[1]).toHaveTextContent("Hi there!");
	});

	it("isLoading이 true일 때 로딩 인디케이터를 표시한다", () => {
		render(
			<MessageList
				messages={[
					mockMessages[0],
					{ ...mockMessages[1], content: "" },
				]}
				isLoading={true}
			/>,
		);

		expect(screen.getByRole("status", { name: "응답 생성 중" })).toBeInTheDocument();
	});

	it('toolCalls가 있는 메시지에서 ToolResult를 렌더링한다', () => {
    const toolCalls: ToolCall[] = [
      { id: 'tc1', name: 'get_weather', input: { city: '서울' },
        status: 'completed', result: '서울 날씨: 맑음, 22도' }
    ];
    const messages = [
      { id: '1', role: 'assistant' as const, content: '날씨를 조회했습니다.',
        timestamp: new Date(), toolCalls }
    ];
    render(<MessageList messages={messages} isLoading={false} />);
    expect(screen.getByText('날씨 조회')).toBeDefined();
    expect(screen.getByText(/서울 날씨/)).toBeDefined();
  });

  it('toolCalls가 없는 메시지에서 ToolResult를 렌더링하지 않는다', () => {
    const messages = [
      { id: '1', role: 'assistant' as const, content: '안녕하세요.',
        timestamp: new Date() }
    ];
    render(<MessageList messages={messages} isLoading={false} />);
    expect(screen.queryByText('날씨 조회')).toBeNull();
  });

	it("어시스턴트 메시지는 ToolResult를 답변 본문 위에 렌더링한다", () => {
		const messages = [
			{
				id: "1",
				role: "assistant" as const,
				content: "계산 결과는 579입니다.",
				timestamp: new Date(),
				toolCalls: [
					{
						id: "tc1",
						name: "calculator",
						input: { expression: "123 + 456" },
						status: "success" as const,
						result: "579",
					},
				],
			},
		];
		render(<MessageList messages={messages} isLoading={false} />);

		const toolLabel = screen.getByText("계산기");
		const answer = screen.getByText("계산 결과는 579입니다.");
		expect(
			toolLabel.compareDocumentPosition(answer) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});
});
