import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeScreen } from "../../src/components/chat/WelcomeScreen";

describe("WelcomeScreen", () => {
	it.each([
		["오늘의 시간", "Asia/Seoul 기준 현재 날짜와 시간을 알려줘."],
		["현재 날씨", "서울의 현재 날씨를 알려줘."],
		["편리한 계산기", "123 + 456을 계산해줘."],
	])("%s 카드는 검증된 툴 유도 프롬프트를 전송한다", async (label, message) => {
		const user = userEvent.setup();
		const onSendMessage = vi.fn();

		render(<WelcomeScreen onSendMessage={onSendMessage} />);

		await user.click(screen.getByRole("button", { name: new RegExp(label) }));

		expect(onSendMessage).toHaveBeenCalledWith(message);
	});
});
