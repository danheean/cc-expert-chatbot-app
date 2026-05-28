import { executeGetWeatherWithRetry } from "../../src/tools/getWeather";

const mockFetcher = jest.fn();

describe("getWeather 에러 처리", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("네트워크 에러 시 재시도하여 성공한다", async () => {
		mockFetcher
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					results: [
						{
							latitude: 37.5,
							longitude: 127,
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
						temperature_2m: 15,
						relative_humidity_2m: 60,
						weather_code: 0,
						wind_speed_10m: 5,
					},
				}),
			});

		const result = await executeGetWeatherWithRetry(
			{ city: "서울" },
			mockFetcher,
		);
		expect(result).toContain("15");
	});

	it("재시도 불가능한 에러는 즉시 던진다", async () => {
		mockFetcher.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ results: [] }),
		});

		await expect(
			executeGetWeatherWithRetry({ city: "없는도시" }, mockFetcher),
		).rejects.toThrow("City not found");

		// Geocoding 한 번만 호출되고 재시도하지 않음
		expect(mockFetcher).toHaveBeenCalledTimes(1);
	});

	it("최대 재시도 횟수 초과 시 에러를 던진다", async () => {
		mockFetcher.mockRejectedValue(new Error("Network error"));

		await expect(
			executeGetWeatherWithRetry({ city: "서울" }, mockFetcher),
		).rejects.toThrow();
	});
});


