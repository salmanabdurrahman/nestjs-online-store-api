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

describe("carts (e2e)", () => {
  const ctx = setupE2eContext();

  it("cart flow", async () => {
    const admin = {
      id: "00000000-0000-4000-8000-000000000999",

      email: "admin-cart@example.com",

      passwordHash: "not-used",

      name: "Admin Cart",

      role: "ADMIN" as const,

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    const customer = {
      id: "00000000-0000-4000-8000-000000000111",

      email: "customer-cart@example.com",

      passwordHash: "not-used",

      name: "Customer Cart",

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

    const categoryResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/categories")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ name: "Cart Books", slug: "cart-books" })

      .expect(201);

    const category = categoryResponse.body as CategoryResponseBody;

    const productResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/products")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({
        categoryId: category.id,

        name: "Cart Book",

        slug: "cart-book",

        price: 25,

        stock: 3,
      })

      .expect(201);

    const product = productResponse.body as ProductResponseBody;

    const emptyCartResponse = await request(ctx.app.getHttpServer())
      .get("/api/v1/cart")

      .set("Authorization", `Bearer ${customerToken}`)

      .expect(200);

    expect((emptyCartResponse.body as CartResponseBody).items).toEqual([]);

    await request(ctx.app.getHttpServer())
      .post("/api/v1/cart/items")

      .send({ productId: product.id, quantity: 1 })

      .expect(401);

    const addResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/cart/items")

      .set("Authorization", `Bearer ${customerToken}`)

      .send({ productId: product.id, quantity: 2 })

      .expect(201);

    const cartAfterAdd = addResponse.body as CartResponseBody;

    expect(cartAfterAdd.items).toHaveLength(1);

    expect(cartAfterAdd.items[0]).toMatchObject({
      productId: product.id,

      quantity: 2,

      unitPriceSnapshot: "25.00",
    });

    const mergeResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/cart/items")

      .set("Authorization", `Bearer ${customerToken}`)

      .send({ productId: product.id, quantity: 1 })

      .expect(201);

    const cartAfterMerge = mergeResponse.body as CartResponseBody;

    expect(cartAfterMerge.items[0]).toMatchObject({ quantity: 3 });

    await request(ctx.app.getHttpServer())
      .post("/api/v1/cart/items")

      .set("Authorization", `Bearer ${customerToken}`)

      .send({ productId: product.id, quantity: 1 })

      .expect(400);

    const updateResponse = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/cart/items/${cartAfterMerge.items[0].id}`)

      .set("Authorization", `Bearer ${customerToken}`)

      .send({ quantity: 1 })

      .expect(200);

    expect((updateResponse.body as CartResponseBody).items[0]).toMatchObject({
      quantity: 1,
    });

    const inactiveProduct = await ctx.prismaMock.product.create({
      data: {
        categoryId: category.id,

        name: "Inactive Cart Book",

        slug: "inactive-cart-book",

        price: 10,

        stock: 1,

        isActive: false,
      },
    });

    await request(ctx.app.getHttpServer())
      .post("/api/v1/cart/items")

      .set("Authorization", `Bearer ${customerToken}`)

      .send({ productId: inactiveProduct.id, quantity: 1 })

      .expect(404);

    const otherCustomerToken = await ctx.createUserToken(
      "00000000-0000-4000-8000-000000000222",
      "other-cart@example.com",
      "CUSTOMER"
    );

    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/cart/items/${cartAfterMerge.items[0].id}`)
      .set("Authorization", `Bearer ${otherCustomerToken}`)
      .send({ quantity: 1 })
      .expect(404);

    await request(ctx.app.getHttpServer())
      .delete(`/api/v1/cart/items/${cartAfterMerge.items[0].id}`)
      .set("Authorization", `Bearer ${otherCustomerToken}`)
      .expect(404);

    const removeResponse = await request(ctx.app.getHttpServer())
      .delete(`/api/v1/cart/items/${cartAfterMerge.items[0].id}`)

      .set("Authorization", `Bearer ${customerToken}`)

      .expect(200);

    expect((removeResponse.body as CartResponseBody).items).toEqual([]);
  });
});
