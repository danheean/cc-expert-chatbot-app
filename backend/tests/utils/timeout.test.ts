import { executeWithTimeout } from "../../src/utils/timeout";

describe("executeWithTimeout", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	it("타임아웃 내에 완료되면 결과를 반환한다", async () => {
		const result = await executeWithTimeout(
			() => Promise.resolve("success"),
			1000,
		);
		expect(result).toBe("success");
	});

	it("타임아웃을 초과하면 타임아웃 에러를 던진다", async () => {
		const slowFn = () =>
			new Promise<string>((r) => setTimeout(() => r("late"), 5000));
		const promise = executeWithTimeout(slowFn, 100);
		jest.advanceTimersByTime(100);

		await expect(promise).rejects.toThrow("Tool execution timeout");
	});
});

