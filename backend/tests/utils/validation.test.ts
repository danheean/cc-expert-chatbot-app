import { validateToolInput } from "../../src/utils/validation";
import { JsonSchema } from "../../src/types/tool";

describe("validateToolInput", () => {
	const schema: JsonSchema = {
		type: "object",
		properties: {
			city: { type: "string", description: "도시명" },
			days: { type: "number", description: "예보 일수" },
		},
		required: ["city"],
	};

	it("필수 필드가 모두 존재하면 에러 없이 통과한다", () => {
		expect(() => validateToolInput({ city: "서울" }, schema)).not.toThrow();
	});

	it("필수 필드가 누락되면 에러를 던진다", () => {
		expect(() => validateToolInput({}, schema)).toThrow(
			"Missing required field: city",
		);
	});

	it("타입이 불일치하면 에러를 던진다", () => {
		expect(() => validateToolInput({ city: 123 }, schema)).toThrow(
			"Field city must be a string",
		);
	});

	it("문자열이 10000자를 초과하면 에러를 던진다", () => {
		const longString = "a".repeat(10001);
		expect(() => validateToolInput({ city: longString }, schema)).toThrow(
			"Field city is too long",
		);
	});
});

