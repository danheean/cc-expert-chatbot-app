import https from "https";
import type { Tool } from "../types/tool";

// --- Types ---

interface FetchResponse {
	ok: boolean;
	status?: number;
	json: () => Promise<unknown>;
}

type Fetcher = (url: string) => Promise<FetchResponse>;

export const CITY_ALIASES: Record<string, string> = {
	서울: "Seoul",
	부산: "Busan",
	인천: "Incheon",
	대구: "Daegu",
	대전: "Daejeon",
	광주: "Gwangju",
	울산: "Ulsan",
	제주: "Jeju City",
	수원: "Suwon",
};

interface GeoResult {
	latitude: number;
	longitude: number;
	name: string;
	country: string;
}

interface CurrentWeather {
	temperature_2m: number;
	relative_humidity_2m: number;
	weather_code: number;
	wind_speed_10m: number;
}

// --- Error classes ---

class CityNotFoundError extends Error {
	constructor(city: string) {
		super(`도시를 찾을 수 없습니다: ${city}`);
		this.name = "CityNotFoundError";
	}
}

class WeatherApiError extends Error {
	constructor(public readonly status: number, message: string) {
		super(message);
		this.name = "WeatherApiError";
	}
}

function isRetryable(err: unknown): boolean {
	if (err instanceof CityNotFoundError) return false;
	if (err instanceof WeatherApiError) return err.status >= 500; // 5xx only
	return true; // network / unknown errors
}

// --- Default fetcher (Node https, IPv4 forced) ---

function httpsGet(url: string, timeoutMs = 8000): Promise<FetchResponse> {
	return new Promise((resolve, reject) => {
		const parsed = new URL(url);
		const req = https.request(
			{
				hostname: parsed.hostname,
				path: parsed.pathname + parsed.search,
				method: "GET",
				family: 4,
			},
			(res) => {
				let data = "";
				res.on("data", (chunk: Buffer) => {
					data += chunk.toString();
				});
				res.on("end", () => {
					const status = res.statusCode ?? 0;
					resolve({
						ok: status >= 200 && status < 300,
						status,
						json: async () => JSON.parse(data) as unknown,
					});
				});
				res.on("error", reject);
			},
		);
		req.setTimeout(timeoutMs, () => {
			req.destroy();
			reject(new Error(`Request timed out after ${timeoutMs}ms`));
		});
		req.on("error", reject);
		req.end();
	});
}

// --- Weather code descriptions ---

const WEATHER_DESCRIPTIONS: Record<number, string> = {
	0: "맑음",
	1: "대체로 맑음",
	2: "구름 조금",
	3: "흐림",
	45: "안개",
	48: "서리 안개",
	51: "이슬비",
	61: "비",
	71: "눈",
	80: "소나기",
	95: "뇌우",
};

function describeWeather(code: number): string {
	return WEATHER_DESCRIPTIONS[code] ?? `날씨 코드 ${code}`;
}

function normalizeCityName(city: string): string {
	const trimmed = city.trim();
	return CITY_ALIASES[trimmed] ?? trimmed;
}

// --- Core execution ---

export async function executeGetWeather(
	input: { city: string },
	fetcher: Fetcher = httpsGet,
): Promise<string> {
	const city = normalizeCityName(input.city);
	const geoUrl =
		`https://geocoding-api.open-meteo.com/v1/search` +
		`?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

	const geoRes = await fetcher(geoUrl);
	if (!geoRes.ok)
		throw new WeatherApiError(
			geoRes.status ?? 0,
			`Geocoding API error: ${geoRes.status}`,
		);

	const geoData = (await geoRes.json()) as { results?: GeoResult[] };
	if (!geoData.results?.length) throw new CityNotFoundError(input.city);

	const location = geoData.results[0];
	if (!location) throw new CityNotFoundError(input.city);
	const { latitude, longitude, name, country } = location;

	const weatherUrl =
		`https://api.open-meteo.com/v1/forecast` +
		`?latitude=${latitude}&longitude=${longitude}` +
		`&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`;

	const weatherRes = await fetcher(weatherUrl);
	if (!weatherRes.ok)
		throw new WeatherApiError(
			weatherRes.status ?? 0,
			`Weather API error: ${weatherRes.status}`,
		);

	const weatherData = (await weatherRes.json()) as { current: CurrentWeather };
	const { temperature_2m, relative_humidity_2m, weather_code, wind_speed_10m } =
		weatherData.current;

	return (
		`${name}, ${country}: ${describeWeather(weather_code)}, ` +
		`기온 ${temperature_2m}°C, 습도 ${relative_humidity_2m}%, 풍속 ${wind_speed_10m} km/h`
	);
}

// --- Exponential backoff ---

type DelayFn = (attempt: number) => Promise<void>;

const exponentialBackoff: DelayFn = (attempt) => {
	const ms = Math.min(Math.pow(2, attempt) * 100, 2000);
	return new Promise((r) => setTimeout(r, ms));
};

// --- With retry (network + 5xx errors, exponential backoff) ---

export async function executeGetWeatherWithRetry(
	input: { city: string },
	fetcher: Fetcher = httpsGet,
	maxRetries = 3,
	delay: DelayFn = exponentialBackoff,
): Promise<string> {
	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await executeGetWeather(input, fetcher);
		} catch (err) {
			if (!isRetryable(err)) throw err;
			lastError = err;
			if (attempt < maxRetries) await delay(attempt);
		}
	}

	throw lastError;
}

// --- Tool export ---

const getWeatherTool: Tool = {
	definition: {
		toolSpec: {
			name: "get_weather",
			description:
				"Returns current weather for a given city using Open-Meteo API.",
			inputSchema: {
				json: {
					type: "object",
					properties: {
						city: {
							type: "string",
							description: 'City name (e.g. "Seoul", "서울").',
						},
					},
					required: ["city"],
				},
			},
		},
	},
	execute: async (input: Record<string, unknown>) => {
		if (typeof input.city !== "string" || !input.city.trim()) {
			throw new Error("도시 이름을 입력해주세요");
		}
		return executeGetWeatherWithRetry({ city: input.city });
	},
};

export { getWeatherTool };
