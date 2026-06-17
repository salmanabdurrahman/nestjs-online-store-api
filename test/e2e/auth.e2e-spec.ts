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
import { expectErrorShape } from "../support/assertions";

describe("auth (e2e)", () => {
  const ctx = setupE2eContext();

  it("auth token flow", async () => {
    const email = "customer@example.com";

    const password = "password123";

    const registerResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/register")

      .send({ email, password, name: "Customer User" })

      .expect(201);

    const registerBody = registerResponse.body as AuthResponseBody;

    expect(registerBody.accessToken).toEqual(expect.any(String));

    expect(registerBody.user).toMatchObject({
      email,

      name: "Customer User",

      role: "CUSTOMER",
    });

    expect(registerBody.user.passwordHash).toBeUndefined();

    const loginResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/login")

      .send({ email, password })

      .expect(201);

    const loginBody = loginResponse.body as AuthResponseBody;

    expect(loginBody.accessToken).toEqual(expect.any(String));

    await request(ctx.app.getHttpServer()).get("/api/v1/auth/me").expect(401);

    const meResponse = await request(ctx.app.getHttpServer())
      .get("/api/v1/auth/me")

      .set("Authorization", `Bearer ${loginBody.accessToken}`)

      .expect(200);

    const meBody = meResponse.body as AuthResponseBody["user"];

    expect(meBody).toMatchObject({
      email,

      name: "Customer User",

      role: "CUSTOMER",
    });

    expect(meBody.passwordHash).toBeUndefined();
  });

  it("covers duplicate email, invalid credentials, invalid token, and missing user", async () => {
    const email = "auth-gap@example.com";

    await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: "password123", name: "Auth Gap" })
      .expect(201);

    const duplicateResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password: "password123", name: "Auth Gap" })
      .expect(409);

    expectErrorShape(duplicateResponse.body);

    const invalidLoginResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "wrong-password" })
      .expect(401);

    expectErrorShape(invalidLoginResponse.body);

    await request(ctx.app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid-token")
      .expect(401);

    const missingUserToken = await ctx.app.get(JwtService).signAsync({
      sub: "00000000-0000-4000-8000-000000009999",
      email: "missing-user@example.com",
      role: "CUSTOMER",
    });

    await request(ctx.app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${missingUserToken}`)
      .expect(401);
  });
});
