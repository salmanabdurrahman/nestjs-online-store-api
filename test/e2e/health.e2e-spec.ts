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

describe("health (e2e)", () => {
  const ctx = setupE2eContext();

  it("/api/v1/health (GET)", async () => {
    const response = await request(ctx.app.getHttpServer())
      .get("/api/v1/health")

      .expect(200);

    const body = response.body as HealthResponseBody;

    expect(body).toMatchObject({
      status: "ok",

      database: {
        status: "ok",
      },
    });

    expect(body.timestamp).toEqual(expect.any(String));

    expect(body.uptime).toEqual(expect.any(Number));
  });
});
