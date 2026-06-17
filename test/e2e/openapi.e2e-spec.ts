/* eslint-disable @typescript-eslint/no-unused-vars */
import request from "supertest";
import { JwtService } from "@nestjs/jwt";
import {
  setupE2eContext,
  AuthResponseBody,
  CategoryResponseBody,
  CategoryListResponseBody,
  ProductResponseBody,
  ProductListResponseBody,
  CartResponseBody,
  OrderResponseBody,
  HealthResponseBody,
  OpenApiResponseBody,
} from "../support/e2e-test-context";

describe("openapi (e2e)", () => {
  const ctx = setupE2eContext();

  it("/openapi.json (GET)", async () => {
    const response = await request(ctx.app.getHttpServer())
      .get("/openapi.json")

      .expect(200);

    const body = response.body as OpenApiResponseBody;

    expect(body.openapi).toBeDefined();

    expect(body.info).toMatchObject({
      title: "NestJS Online Store API",

      version: "1.0.0",
    });

    expect(body.components.securitySchemes.bearer).toMatchObject({
      type: "http",

      scheme: "bearer",

      bearerFormat: "JWT",
    });

    expect(body.paths["/api/v1/health"]).toBeDefined();
  });

  it("/docs (GET)", () => {
    return request(ctx.app.getHttpServer())
      .get("/docs")

      .expect(200)

      .expect("Content-Type", /html/);
  });
});
