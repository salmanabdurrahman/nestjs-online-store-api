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

describe("categories (e2e)", () => {
  const ctx = setupE2eContext();

  it("categories CRUD flow", async () => {
    const admin = {
      id: "00000000-0000-4000-8000-000000000999",

      email: "admin@example.com",

      passwordHash: "not-used",

      name: "Admin User",

      role: "ADMIN" as const,

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    const customer = {
      id: "00000000-0000-4000-8000-000000000111",
      email: "customer-category@example.com",
      passwordHash: "not-used",
      name: "Customer Category",
      role: "CUSTOMER" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    ctx.users.push(admin, customer);

    const adminToken = await ctx.app.get(JwtService).signAsync({
      sub: admin.id,

      email: admin.email,

      role: admin.role,
    });

    const customerToken = await ctx.app.get(JwtService).signAsync({
      sub: customer.id,
      email: customer.email,
      role: customer.role,
    });

    await request(ctx.app.getHttpServer())
      .post("/api/v1/categories")

      .send({ name: "Books", slug: "books" })

      .expect(401);

    await request(ctx.app.getHttpServer())
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ name: "Books", slug: "books" })
      .expect(403);

    const createResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/categories")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({
        name: "Books",

        slug: "books",

        description: "Book collection",
      })

      .expect(201);

    const createdCategory = createResponse.body as CategoryResponseBody;

    expect(createdCategory).toMatchObject({
      name: "Books",

      slug: "books",

      description: "Book collection",

      isActive: true,
    });

    await request(ctx.app.getHttpServer())
      .post("/api/v1/categories")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ name: "Duplicate Books", slug: "books" })

      .expect(409);

    const listResponse = await request(ctx.app.getHttpServer())
      .get("/api/v1/categories?page=1&limit=10")

      .expect(200);

    const listBody = listResponse.body as CategoryListResponseBody;

    expect(listBody.data).toHaveLength(1);

    expect(listBody.meta).toMatchObject({
      page: 1,

      limit: 10,

      total: 1,

      totalPages: 1,
    });

    const detailResponse = await request(ctx.app.getHttpServer())
      .get(`/api/v1/categories/${createdCategory.id}`)

      .expect(200);

    expect(detailResponse.body).toMatchObject({ slug: "books" });

    const updateResponse = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/categories/${createdCategory.id}`)

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ name: "Updated Books", slug: "updated-books" })

      .expect(200);

    expect(updateResponse.body).toMatchObject({
      name: "Updated Books",

      slug: "updated-books",
    });

    const deleteResponse = await request(ctx.app.getHttpServer())
      .delete(`/api/v1/categories/${createdCategory.id}`)

      .set("Authorization", `Bearer ${adminToken}`)

      .expect(200);

    expect(deleteResponse.body).toMatchObject({ isActive: false });

    const emptyListResponse = await request(ctx.app.getHttpServer())
      .get("/api/v1/categories")

      .expect(200);

    expect((emptyListResponse.body as CategoryListResponseBody).data).toEqual(
      []
    );

    await request(ctx.app.getHttpServer())
      .get(`/api/v1/categories/${createdCategory.id}`)

      .expect(404);
  });
});
