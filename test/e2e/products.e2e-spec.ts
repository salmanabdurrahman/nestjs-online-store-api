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

describe("products (e2e)", () => {
  const ctx = setupE2eContext();

  it("products relation CRUD flow", async () => {
    const admin = {
      id: "00000000-0000-4000-8000-000000000999",

      email: "admin-products@example.com",

      passwordHash: "not-used",

      name: "Admin Products",

      role: "ADMIN" as const,

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    ctx.users.push(admin);

    const adminToken = await ctx.app.get(JwtService).signAsync({
      sub: admin.id,

      email: admin.email,

      role: admin.role,
    });

    const categoryResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/categories")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ name: "Electronics", slug: "electronics" })

      .expect(201);

    const category = categoryResponse.body as CategoryResponseBody;

    await request(ctx.app.getHttpServer())
      .post("/api/v1/products")

      .send({
        categoryId: category.id,

        name: "Laptop",

        slug: "laptop",

        price: 1500,

        stock: 5,
      })

      .expect(401);

    await request(ctx.app.getHttpServer())
      .post("/api/v1/products")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({
        categoryId: "00000000-0000-4000-8000-000000000404",

        name: "Invalid Product",

        slug: "invalid-product",

        price: 10,

        stock: 1,
      })

      .expect(404);

    await request(ctx.app.getHttpServer())
      .post("/api/v1/products")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({
        categoryId: category.id,

        name: "Free Laptop",

        slug: "free-laptop",

        price: 0,

        stock: 1,
      })

      .expect(400);

    const createResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/products")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({
        categoryId: category.id,

        name: "Laptop",

        slug: "laptop",

        description: "Portable computer",

        price: 1500,

        stock: 5,
      })

      .expect(201);

    const createdProduct = createResponse.body as ProductResponseBody;

    expect(createdProduct).toMatchObject({
      categoryId: category.id,

      name: "Laptop",

      slug: "laptop",

      description: "Portable computer",

      price: "1500.00",

      stock: 5,

      isActive: true,
    });

    await request(ctx.app.getHttpServer())
      .post("/api/v1/products")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({
        categoryId: category.id,

        name: "Duplicate Laptop",

        slug: "laptop",

        price: 100,

        stock: 1,
      })

      .expect(409);

    await request(ctx.app.getHttpServer())
      .get("/api/v1/products?minPrice=2000&maxPrice=1000")
      .expect(400);

    const inactiveCategory = await ctx.prismaMock.category.create({
      data: {
        name: "Inactive Category",
        slug: "inactive-category",
        isActive: false,
      },
    });

    await request(ctx.app.getHttpServer())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        categoryId: inactiveCategory.id,
        name: "Inactive Category Product",
        slug: "inactive-category-product",
        price: 100,
        stock: 1,
      })
      .expect(404);

    const listResponse = await request(ctx.app.getHttpServer())
      .get(
        "/api/v1/products?search=portable&categorySlug=electronics&minPrice=1000&maxPrice=2000"
      )

      .expect(200);

    const listBody = listResponse.body as ProductListResponseBody;

    expect(listBody.data).toHaveLength(1);

    expect(listBody.data[0]).toMatchObject({ slug: "laptop" });

    const detailResponse = await request(ctx.app.getHttpServer())
      .get(`/api/v1/products/${createdProduct.id}`)

      .expect(200);

    expect(detailResponse.body).toMatchObject({
      slug: "laptop",

      category: { id: category.id, slug: "electronics" },
    });

    const updateResponse = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/products/${createdProduct.id}`)

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ name: "Updated Laptop", stock: 3 })

      .expect(200);

    expect(updateResponse.body).toMatchObject({
      name: "Updated Laptop",

      stock: 3,
    });

    const deleteResponse = await request(ctx.app.getHttpServer())
      .delete(`/api/v1/products/${createdProduct.id}`)

      .set("Authorization", `Bearer ${adminToken}`)

      .expect(200);

    expect(deleteResponse.body).toMatchObject({ isActive: false });

    await request(ctx.app.getHttpServer())
      .get(`/api/v1/products/${createdProduct.id}`)

      .expect(404);
  });
});
