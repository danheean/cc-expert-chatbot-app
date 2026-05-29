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

		it("한국어 서울 입력을 Open-Meteo용 Seoul 검색어로 정규화한다", async () => {
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
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						current: {
							temperature_2m: 20,
							relative_humidity_2m: 50,
							weather_code: 0,
							wind_speed_10m: 2,
						},
					}),
				});

			await executeGetWeather({ city: "서울" }, mockFetcher);

			expect(mockFetcher.mock.calls[0][0]).toContain("name=Seoul");
		});

		it("한국어 부산 입력을 Open-Meteo용 Busan 검색어로 정규화한다", async () => {
			mockFetcher
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						results: [
							{
								latitude: 35.1796,
								longitude: 129.0756,
								name: "Busan",
								country: "South Korea",
							},
						],
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						current: {
							temperature_2m: 21,
							relative_humidity_2m: 55,
							weather_code: 0,
							wind_speed_10m: 3,
						},
					}),
				});

			await executeGetWeather({ city: "부산" }, mockFetcher);

			expect(mockFetcher.mock.calls[0][0]).toContain("name=Busan");
		});

		it("도구 입력에 city가 없으면 명시적으로 실패한다", async () => {
			await expect(getWeatherTool.execute({})).rejects.toThrow(
				"도시 이름을 입력해주세요",
			);
		});

		it("도시를 찾을 수 없는 경우를 처리한다", async () => {
			mockFetcher.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ results: [] }),
			});

			await expect(
				executeGetWeather({ city: "없는도시" }, mockFetcher),
			).rejects.toThrow("도시를 찾을 수 없습니다");
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

