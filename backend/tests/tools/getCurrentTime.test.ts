import {
	getCurrentTimeTool,
	executeGetCurrentTime,
} from "../../src/tools/getCurrentTime";

describe("getCurrentTime 도구", () => {
	describe("도구 정의", () => {
		it("올바른 이름을 가진다", () => {
			expect(getCurrentTimeTool.definition.toolSpec.name).toBe(
				"get_current_time",
			);
		});

		it("timezone을 필수 파라미터로 가진다", () => {
			const schema = getCurrentTimeTool.definition.toolSpec.inputSchema.json;
			expect(schema.required).toContain("timezone");
		});
	});

	describe("실행", () => {
		it("유효한 타임존의 현재 시간을 반환한다", async () => {
			const result = await executeGetCurrentTime({ timezone: "Asia/Seoul" });

			expect(result).toMatch(/\d{4}-\d{2}-\d{2}/); // YYYY-MM-DD 형식
			expect(result).toMatch(/\d{2}:\d{2}:\d{2}/); // HH:MM:SS 형식
		});

		it("올바른 타임존의 시간을 반환한다", async () => {
			const seoulResult = await executeGetCurrentTime({
				timezone: "Asia/Seoul",
			});
			const nyResult = await executeGetCurrentTime({
				timezone: "America/New_York",
			});

			// 서울과 뉴욕 시간은 다르다 (같은 순간이라도)
			expect(seoulResult).not.toBe(nyResult);
		});

		it("유효하지 않은 타임존에 대해 에러를 던진다", async () => {
			await expect(
				executeGetCurrentTime({ timezone: "Invalid/Timezone" }),
			).rejects.toThrow();
		});

		it("타임존이 비어있으면 UTC를 기본값으로 사용한다", async () => {
			const result = await executeGetCurrentTime({ timezone: "" });

			expect(result).toContain("UTC");
		});
	});
});

