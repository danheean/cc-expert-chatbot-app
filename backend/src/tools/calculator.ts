import type { Tool } from "../types/tool";

// --- Lexer ---

type TokenType =
	| "NUMBER"
	| "PLUS"
	| "MINUS"
	| "MULTIPLY"
	| "DIVIDE"
	| "POWER"
	| "LPAREN"
	| "RPAREN"
	| "FUNC"
	| "EOF";

interface Token {
	type: TokenType;
	value: string;
}

function tokenize(expr: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;

	while (i < expr.length) {
		const ch = expr[i];

		if (/\s/.test(ch)) {
			i++;
			continue;
		}

		if (/\d/.test(ch) || (ch === "." && /\d/.test(expr[i + 1] ?? ""))) {
			let num = "";
			while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === ".")) {
				num += expr[i++];
			}
			tokens.push({ type: "NUMBER", value: num });
			continue;
		}

		if (/[a-z]/i.test(ch)) {
			let name = "";
			while (i < expr.length && /[a-z]/i.test(expr[i])) {
				name += expr[i++];
			}
			if (name !== "sqrt") throw new Error(`Unknown function: ${name}`);
			tokens.push({ type: "FUNC", value: name });
			continue;
		}

		switch (ch) {
			case "+":
				tokens.push({ type: "PLUS", value: "+" });
				i++;
				break;
			case "-":
				tokens.push({ type: "MINUS", value: "-" });
				i++;
				break;
			case "*":
				if (expr[i + 1] === "*") {
					tokens.push({ type: "POWER", value: "**" });
					i += 2;
				} else {
					tokens.push({ type: "MULTIPLY", value: "*" });
					i++;
				}
				break;
			case "/":
				tokens.push({ type: "DIVIDE", value: "/" });
				i++;
				break;
			case "^":
				tokens.push({ type: "POWER", value: "^" });
				i++;
				break;
			case "(":
				tokens.push({ type: "LPAREN", value: "(" });
				i++;
				break;
			case ")":
				tokens.push({ type: "RPAREN", value: ")" });
				i++;
				break;
			default:
				throw new Error(`Unexpected character: ${ch}`);
		}
	}

	tokens.push({ type: "EOF", value: "" });
	return tokens;
}

// --- Recursive Descent Parser ---
// Grammar:
//   expr   → term   (('+' | '-') term)*
//   term   → power  (('*' | '/') power)*
//   power  → unary  (('^' | '**') unary)*   right-associative via recursion
//   unary  → '-' unary | factor
//   factor → NUMBER | '(' expr ')' | FUNC '(' expr ')'

class Parser {
	private pos = 0;

	constructor(private readonly tokens: Token[]) {}

	private peek(): Token {
		return this.tokens[this.pos];
	}

	private consume(): Token {
		return this.tokens[this.pos++];
	}

	private expect(type: TokenType): Token {
		const t = this.consume();
		if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type}`);
		return t;
	}

	parse(): number {
		const result = this.parseExpr();
		if (this.peek().type !== "EOF") {
			throw new Error(`Unexpected token: ${this.peek().value}`);
		}
		return result;
	}

	private parseExpr(): number {
		let left = this.parseTerm();

		while (
			this.peek().type === "PLUS" ||
			this.peek().type === "MINUS"
		) {
			const op = this.consume().type;
			const right = this.parseTerm();
			left = op === "PLUS" ? left + right : left - right;
		}

		return left;
	}

	private parseTerm(): number {
		let left = this.parsePower();

		while (
			this.peek().type === "MULTIPLY" ||
			this.peek().type === "DIVIDE"
		) {
			const op = this.consume().type;
			const right = this.parsePower();
			if (op === "DIVIDE") {
				if (right === 0) throw new Error("Division by zero");
				left /= right;
			} else {
				left *= right;
			}
		}

		return left;
	}

	private parsePower(): number {
		const base = this.parseUnary();

		if (this.peek().type === "POWER") {
			this.consume();
			const exp = this.parsePower(); // right-associative
			return Math.pow(base, exp);
		}

		return base;
	}

	private parseUnary(): number {
		if (this.peek().type === "MINUS") {
			this.consume();
			return -this.parseUnary();
		}
		return this.parseFactor();
	}

	private parseFactor(): number {
		const t = this.peek();

		if (t.type === "NUMBER") {
			this.consume();
			return parseFloat(t.value);
		}

		if (t.type === "LPAREN") {
			this.consume();
			const val = this.parseExpr();
			this.expect("RPAREN");
			return val;
		}

		if (t.type === "FUNC") {
			this.consume();
			this.expect("LPAREN");
			const arg = this.parseExpr();
			this.expect("RPAREN");
			if (arg < 0) throw new Error("sqrt of negative number");
			return Math.sqrt(arg);
		}

		throw new Error(`Unexpected token: ${t.value || t.type}`);
	}
}

// --- Public API ---

export async function executeCalculator(input: {
	expression: string;
}): Promise<string> {
	const expr = input.expression.trim();
	if (!expr) throw new Error("Empty expression");

	const tokens = tokenize(expr);
	const result = new Parser(tokens).parse();

	return Number.isInteger(result) ? String(result) : String(result);
}

const calculatorTool: Tool = {
	definition: {
		toolSpec: {
			name: "calculator",
			description:
				"Evaluates a mathematical expression and returns the result. Supports +, -, *, /, ^, **, sqrt().",
			inputSchema: {
				json: {
					type: "object",
					properties: {
						expression: {
							type: "string",
							description:
								"Mathematical expression to evaluate (e.g. '2 + 3 * 4', 'sqrt(16)', '2 ^ 10').",
						},
					},
					required: ["expression"],
				},
			},
		},
	},
	execute: (input: Record<string, unknown>) =>
		executeCalculator({ expression: (input.expression as string) ?? "" }),
};

export { calculatorTool };
