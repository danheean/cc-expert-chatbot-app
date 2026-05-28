import { errorHandler, ApiError } from "../../src/middleware/errorHandler";

describe("에러 핸들러", () => {
	let mockRes: any;

	beforeEach(() => {
		mockRes = {
			status: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
		};
		jest.spyOn(console, "error").mockImplementation(() => {});
	});

	it("일반 에러에 대해 500을 반환한다", () => {
		const error: ApiError = new Error("Something went wrong");
		errorHandler(error, {} as any, mockRes, jest.fn());

		expect(mockRes.status).toHaveBeenCalledWith(500);
		expect(mockRes.json).toHaveBeenCalledWith({
			error: { message: "Something went wrong", code: undefined },
		});
	});

	it("커스텀 statusCode가 제공되면 사용한다", () => {
		const error: ApiError = new Error("Not Found");
		error.statusCode = 404;
		error.code = "NOT_FOUND";
		errorHandler(error, {} as any, mockRes, jest.fn());

		expect(mockRes.status).toHaveBeenCalledWith(404);
	});
});

