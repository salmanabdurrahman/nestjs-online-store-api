import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";

const errorBodySchema = {
  type: "object",
  required: ["statusCode", "message", "errors", "timestamp", "path"],
  properties: {
    statusCode: { type: "number" },
    message: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          path: { type: "string" },
          message: { type: "string" },
        },
      },
    },
    timestamp: { type: "string", format: "date-time" },
    path: { type: "string" },
  },
};

const descriptions: Record<number, string> = {
  400: "Bad request or validation error",
  401: "Missing or invalid bearer token",
  403: "Authenticated user is not allowed to access this resource",
  404: "Resource not found",
  409: "Resource conflict",
};

export function ApiErrorResponses(statusCodes: number[]) {
  return applyDecorators(
    ...statusCodes.map((status) =>
      ApiResponse({
        status,
        description: descriptions[status] ?? "Error response",
        schema: errorBodySchema,
      })
    )
  );
}
