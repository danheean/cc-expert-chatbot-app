import { calculatorTool, executeCalculator } from "../../src/tools/calculator";

describe("계산기 도구", () => {
	describe("도구 정의", () => {
		it("올바른 이름을 가진다", () => {
			expect(calculatorTool.definition.toolSpec.name).toBe("calculator");
		});

		it("expression을 필수 파라미터로 가진다", () => {
			const schema = calculatorTool.definition.toolSpec.inputSchema.json;
			expect(schema.required).toContain("expression");
		});
	});

	describe("실행", () => {
		describe("기본 산술 연산", () => {
			it("덧셈을 계산한다", async () => {
				const result = await executeCalculator({ expression: "2 + 3" });
				expect(result).toBe("5");
			});

			it("뺄셈을 계산한다", async () => {
				const result = await executeCalculator({ expression: "10 - 4" });
				expect(result).toBe("6");
			});

			it("곱셈을 계산한다", async () => {
				const result = await executeCalculator({ expression: "6 * 7" });
				expect(result).toBe("42");
			});

			it("나눗셈을 계산한다", async () => {
				const result = await executeCalculator({ expression: "20 / 4" });
				expect(result).toBe("5");
			});

			it("소수점 결과를 처리한다", async () => {
				const result = await executeCalculator({ expression: "10 / 3" });
				expect(parseFloat(result)).toBeCloseTo(3.333, 2);
			});
		});

		describe("복합 연산", () => {
			it("연산자 우선순위를 지킨다", async () => {
				const result = await executeCalculator({ expression: "2 + 3 * 4" });
				expect(result).toBe("14");
			});

			it("괄호를 처리한다", async () => {
				const result = await executeCalculator({ expression: "(2 + 3) * 4" });
				expect(result).toBe("20");
			});

			it("중첩 괄호를 처리한다", async () => {
				const result = await executeCalculator({
					expression: "((2 + 3) * (4 - 1))",
				});
				expect(result).toBe("15");
			});
		});

		describe("고급 연산", () => {
			it("^로 거듭제곱을 계산한다", async () => {
				const result = await executeCalculator({ expression: "2 ^ 10" });
				expect(result).toBe("1024");
			});

			it("**로 거듭제곱을 계산한다", async () => {
				const result = await executeCalculator({ expression: "2 ** 10" });
				expect(result).toBe("1024");
			});

			it("제곱근을 계산한다", async () => {
				const result = await executeCalculator({ expression: "sqrt(16)" });
				expect(result).toBe("4");
			});

			it("음수를 처리한다", async () => {
				const result = await executeCalculator({ expression: "-5 + 3" });
				expect(result).toBe("-2");
			});
		});

		describe("에러 처리", () => {
			it("0으로 나누면 에러를 던진다", async () => {
				await expect(
					executeCalculator({ expression: "10 / 0" }),
				).rejects.toThrow();
			});

			it("유효하지 않은 수식에 대해 에러를 던진다", async () => {
				await expect(
					executeCalculator({ expression: "2 + + 3" }),
				).rejects.toThrow();
			});

			it("빈 수식에 대해 에러를 던진다", async () => {
				await expect(executeCalculator({ expression: "" })).rejects.toThrow();
			});
		});
	});
});


