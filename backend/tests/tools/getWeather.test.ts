import { getWeatherTool, executeGetWeather } from "../../src/tools/getWeather";

// HTTP 호출 함수 모킹: executeGetWeather의 두 번째 인자로 주입한다
const mockFetcher = jest.fn();

describe("날씨 조회 도구", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("도구 정의", () => {
		it("올바른 이름을 가진다", () => {
			expect(getWeatherTool.definition.toolSpec.name).toBe("get_weather");
		});

		it("city를 필수 파라미터로 가진다", () => {
			const schema = getWeatherTool.definition.toolSpec.inputSchema.json;
			expect(schema.required).toContain("city");
		});
	});

	describe("실행", () => {
		it("유효한 도시의 날씨를 반환한다", async () => {
			// Geocoding API 모킹
			mockFetcher
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						results: [
							{
								latitude: 37.5665,
								longitude: 126.978,
								name: "Seoul",
								country: "South Korea",
							},
						],
					}),
				})
				// Weather API 모킹
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						current: {
							temperature_2m: 15.5,
							relative_humidity_2m: 60,
							weather_code: 0,
							wind_speed_10m: 5.2,
						},
					}),
				});

			const result = await executeGetWeather({ city: "서울" }, mockFetcher);

			expect(result).toContain("15.5");
			expect(result).toContain("60");
		});

		it("도시를 찾을 수 없는 경우를 처리한다", async () => {
			mockFetcher.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ results: [] }),
			});

			await expect(
				executeGetWeather({ city: "없는도시" }, mockFetcher),
			).rejects.toThrow("City not found");
		});

		it("API 에러를 처리한다", async () => {
			mockFetcher.mockResolvedValueOnce({
				ok: false,
				status: 500,
			});

			await expect(
				executeGetWeather({ city: "서울" }, mockFetcher),
			).rejects.toThrow();
		});

		it("네트워크 에러를 처리한다", async () => {
			mockFetcher.mockRejectedValueOnce(new Error("Network error"));

			await expect(
				executeGetWeather({ city: "서울" }, mockFetcher),
			).rejects.toThrow("Network error");
		});
	});
});

