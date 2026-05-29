import type { JsonSchema } from "../types/tool";

const MAX_STRING_LENGTH = 10000;

export function validateToolInput(
	input: Record<string, unknown>,
	schema: JsonSchema,
): void {
	for (const field of schema.required ?? []) {
		if (!(field in input)) {
			throw new Error(`Missing required field: ${field}`);
		}
	}

	for (const [field, value] of Object.entries(input)) {
		const propSchema = schema.properties[field];
		if (!propSchema) continue;

		if (typeof value !== propSchema.type) {
			throw new Error(`Field ${field} must be a ${propSchema.type}`);
		}

		if (propSchema.type === "string" && (value as string).length > MAX_STRING_LENGTH) {
			throw new Error(`Field ${field} is too long`);
		}
	}
}
