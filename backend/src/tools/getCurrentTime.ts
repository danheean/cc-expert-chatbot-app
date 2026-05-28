import type { Tool } from "../types/tool";

export async function executeGetCurrentTime(input: {
	timezone: string;
}): Promise<string> {
	const tz = input.timezone || "UTC";

	const formatter = new Intl.DateTimeFormat("sv-SE", {
		timeZone: tz,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	// Intl.DateTimeFormat throws RangeError for invalid timezones
	const parts = formatter.formatToParts(new Date());
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

	const date = `${get("year")}-${get("month")}-${get("day")}`;
	const time = `${get("hour")}:${get("minute")}:${get("second")}`;

	return `${date} ${time} ${tz}`;
}

const getCurrentTimeTool: Tool = {
	definition: {
		toolSpec: {
			name: "get_current_time",
			description: "Returns the current date and time for a given timezone.",
			inputSchema: {
				json: {
					type: "object",
					properties: {
						timezone: {
							type: "string",
							description:
								"IANA timezone name (e.g. Asia/Seoul). Leave empty to use UTC.",
						},
					},
					required: ["timezone"],
				},
			},
		},
	},
	execute: (input: Record<string, unknown>) =>
		executeGetCurrentTime({ timezone: (input.timezone as string) ?? "" }),
};

export { getCurrentTimeTool };
