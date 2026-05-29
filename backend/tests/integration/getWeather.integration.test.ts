import { executeGetWeather } from "../../src/tools/getWeather";

describe("getWeather 통합 테스트", () => {
	// fetcher를 생략하면 기본값 httpGet(IPv4 강제)이 사용된다.
	// 실제 API 호출이므로 타임아웃을 넉넉히 설정한다.
	it("실제 날씨 데이터를 조회한다", async () => {
		const result = await executeGetWeather({ city: "Seoul" });

		// 실제 반환값의 형식만 검증 (구체적인 수치는 매번 달라진다)
		expect(result).toContain("기온");
		expect(result).toContain("습도");
		expect(result).toContain("°C");
	}, 10000);

	it("존재하지 않는 도시에 대해 에러를 던진다", async () => {
		await expect(executeGetWeather({ city: "asdfjkl12345" })).rejects.toThrow(
			"City not found",
		);
	}, 10000);
});

