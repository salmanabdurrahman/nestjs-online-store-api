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

describe("app (e2e)", () => {
  const ctx = setupE2eContext();

  it("/ (GET)", () => {
    return request(ctx.app.getHttpServer())
      .get("/api/v1")

      .expect(200)

      .expect("Hello World!");
  });
});
