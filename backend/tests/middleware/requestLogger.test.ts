import { requestLogger } from "../../src/middleware/requestLogger";

describe("요청 로거", () => {
	it("next()를 호출하고 finish 이벤트 리스너를 등록한다", () => {
		const mockReq = { method: "GET", path: "/api/sessions" } as any;
		const mockRes = { statusCode: 200, on: jest.fn() } as any;
		const mockNext = jest.fn();

		requestLogger(mockReq, mockRes, mockNext);

		expect(mockNext).toHaveBeenCalled();
		expect(mockRes.on).toHaveBeenCalledWith("finish", expect.any(Function));
	});
});


