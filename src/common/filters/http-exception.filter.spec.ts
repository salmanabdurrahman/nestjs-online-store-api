import { BadRequestException, Logger } from "@nestjs/common";
import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: "/api/v1/test" }),
    }),
  } as never;

  beforeEach(() => jest.clearAllMocks());

  afterEach(() => jest.restoreAllMocks());

  it("normalizes validation errors", () => {
    new HttpExceptionFilter().catch(
      new BadRequestException({
        message: ["email is invalid"],
        error: "Validation failed",
        statusCode: 400,
      }),
      host
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: "Validation failed",
        errors: [{ message: "email is invalid" }],
        path: "/api/v1/test",
      })
    );
  });

  it("normalizes custom and internal errors", () => {
    const loggerSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => undefined);

    new HttpExceptionFilter().catch(new BadRequestException("Bad input"), host);
    expect(json).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: "Bad input", errors: [] })
    );

    new HttpExceptionFilter().catch(new Error("boom"), host);
    expect(status).toHaveBeenLastCalledWith(500);
    expect(json).toHaveBeenLastCalledWith(
      expect.objectContaining({ message: "Internal server error", errors: [] })
    );
    expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining("boom"));
  });
});
