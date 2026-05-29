import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "../../src/components/chat/MessageInput";

describe("MessageInput", () => {
	it("입력 필드와 전송 버튼을 렌더링한다", () => {
		render(<MessageInput onSend={vi.fn()} />);

		expect(screen.getByPlaceholderText(/메시지/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /전송/ })).toBeInTheDocument();
	});

	it("메시지 전송 시 onSend를 호출한다", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();

		render(<MessageInput onSend={onSend} />);

		const input = screen.getByPlaceholderText(/메시지/);
		await user.type(input, "Hello World");
		await user.click(screen.getByRole("button", { name: /전송/ }));

		expect(onSend).toHaveBeenCalledWith("Hello World");
	});

	it("전송 후 입력 필드를 초기화한다", async () => {
		const user = userEvent.setup();

		render(<MessageInput onSend={vi.fn()} />);

		const input = screen.getByPlaceholderText(/메시지/) as HTMLTextAreaElement;
		await user.type(input, "Hello");
		await user.click(screen.getByRole("button", { name: /전송/ }));

		expect(input.value).toBe("");
	});

	it("빈 메시지는 전송하지 않는다", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();

		render(<MessageInput onSend={onSend} />);

		await user.click(screen.getByRole("button", { name: /전송/ }));

		expect(onSend).not.toHaveBeenCalled();
	});

	it("isLoading이 true일 때 입력을 비활성화한다", () => {
		render(<MessageInput onSend={vi.fn()} isLoading={true} />);

		expect(screen.getByPlaceholderText(/메시지/)).toBeDisabled();
		expect(screen.getByRole("button", { name: /전송/ })).toBeDisabled();
	});

	it("Enter 키로 메시지를 전송한다", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();

		render(<MessageInput onSend={onSend} />);

		const input = screen.getByPlaceholderText(/메시지/);
		await user.type(input, "Hello{Enter}");

		expect(onSend).toHaveBeenCalledWith("Hello");
	});

	it("Shift+Enter로 줄바꿈한다", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();

		render(<MessageInput onSend={onSend} />);

		const input = screen.getByPlaceholderText(/메시지/) as HTMLTextAreaElement;
		await user.type(input, "Line1{Shift>}{Enter}{/Shift}Line2");

		expect(input.value).toContain("Line1");
		expect(input.value).toContain("Line2");
		expect(onSend).not.toHaveBeenCalled();
	});
});
