import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

type ErrorDetail = {
  path?: string;
  message: string;
};

type ExceptionResponse = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
  errors?: ErrorDetail[];
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const normalized = this.normalizeExceptionResponse(exceptionResponse);

    if (status >= 500) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception)
      );
    }

    response.status(status).json({
      statusCode: status,
      message: normalized.message,
      errors: normalized.errors,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private normalizeExceptionResponse(response: unknown): {
    message: string;
    errors: ErrorDetail[];
  } {
    if (typeof response === "string") {
      return { message: response, errors: [] };
    }

    if (!response || typeof response !== "object") {
      return { message: "Internal server error", errors: [] };
    }

    const body = response as ExceptionResponse;

    if (body.errors?.length) {
      return {
        message:
          this.firstMessage(body.message) ?? body.error ?? "Request failed",
        errors: body.errors,
      };
    }

    if (Array.isArray(body.message)) {
      return {
        message: body.error ?? "Validation failed",
        errors: body.message.map((message) => ({ message })),
      };
    }

    return {
      message: body.message ?? body.error ?? "Request failed",
      errors: [],
    };
  }

  private firstMessage(message?: string | string[]): string | undefined {
    return Array.isArray(message) ? message[0] : message;
  }
}
