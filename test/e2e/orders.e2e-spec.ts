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

describe("orders (e2e)", () => {
  const ctx = setupE2eContext();

  it("orders checkout flow", async () => {
    const adminToken = await ctx.createUserToken(
      "00000000-0000-4000-8000-000000000998",

      "admin-orders@example.com",

      "ADMIN"
    );

    const customerId = "00000000-0000-4000-8000-000000000112";

    const customerToken = await ctx.createUserToken(
      customerId,

      "customer-orders@example.com",

      "CUSTOMER"
    );

    const categoryResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/categories")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ name: "Order Books", slug: "order-books" })

      .expect(201);

    const category = categoryResponse.body as CategoryResponseBody;

    const productResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/products")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({
        categoryId: category.id,

        name: "Order Book",

        slug: "order-book",

        price: 30,

        stock: 5,
      })

      .expect(201);

    const product = productResponse.body as ProductResponseBody;

    await request(ctx.app.getHttpServer())
      .post("/api/v1/orders/checkout")

      .expect(401);

    await request(ctx.app.getHttpServer())
      .post("/api/v1/orders/checkout")

      .set("Authorization", `Bearer ${customerToken}`)

      .expect(400);

    await request(ctx.app.getHttpServer())
      .post("/api/v1/cart/items")

      .set("Authorization", `Bearer ${customerToken}`)

      .send({ productId: product.id, quantity: 2 })

      .expect(201);

    const checkoutResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/orders/checkout")

      .set("Authorization", `Bearer ${customerToken}`)

      .expect(201);

    const order = checkoutResponse.body as OrderResponseBody;

    expect(order).toMatchObject({
      userId: customerId,

      status: "PENDING",

      totalAmount: "60.00",
    });

    expect(order.items).toHaveLength(1);

    expect(order.items[0]).toMatchObject({
      productId: product.id,

      quantity: 2,

      unitPriceSnapshot: "30.00",

      subtotal: "60.00",
    });

    expect(ctx.findProduct(product.id)?.stock).toBe(3);

    const cartAfterCheckout = await request(ctx.app.getHttpServer())
      .get("/api/v1/cart")

      .set("Authorization", `Bearer ${customerToken}`)

      .expect(200);

    expect((cartAfterCheckout.body as CartResponseBody).items).toEqual([]);

    const listResponse = await request(ctx.app.getHttpServer())
      .get("/api/v1/orders")

      .set("Authorization", `Bearer ${customerToken}`)

      .expect(200);

    expect(
      (listResponse.body as { data: OrderResponseBody[] }).data
    ).toHaveLength(1);

    const detailResponse = await request(ctx.app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)

      .set("Authorization", `Bearer ${customerToken}`)

      .expect(200);

    expect(detailResponse.body).toMatchObject({ id: order.id });

    const otherCustomerToken = await ctx.createUserToken(
      "00000000-0000-4000-8000-000000000113",
      "other-orders@example.com",
      "CUSTOMER"
    );

    await request(ctx.app.getHttpServer())
      .get(`/api/v1/orders/${order.id}`)
      .set("Authorization", `Bearer ${otherCustomerToken}`)
      .expect(403);

    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ status: "PAID" })
      .expect(403);

    const statusResponse = await request(ctx.app.getHttpServer())
      .patch(`/api/v1/orders/${order.id}/status`)

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ status: "PAID" })

      .expect(200);

    expect(statusResponse.body).toMatchObject({ status: "PAID" });
  });

  it("rejects checkout when stock becomes insufficient", async () => {
    const adminToken = await ctx.createUserToken(
      "00000000-0000-4000-8000-000000000997",

      "admin-stock@example.com",

      "ADMIN"
    );

    const customerToken = await ctx.createUserToken(
      "00000000-0000-4000-8000-000000000113",

      "customer-stock@example.com",

      "CUSTOMER"
    );

    const categoryResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/categories")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ name: "Stock Books", slug: "stock-books" })

      .expect(201);

    const category = categoryResponse.body as CategoryResponseBody;

    const productResponse = await request(ctx.app.getHttpServer())
      .post("/api/v1/products")

      .set("Authorization", `Bearer ${adminToken}`)

      .send({
        categoryId: category.id,

        name: "Stock Book",

        slug: "stock-book",

        price: 10,

        stock: 2,
      })

      .expect(201);

    const product = productResponse.body as ProductResponseBody;

    await request(ctx.app.getHttpServer())
      .post("/api/v1/cart/items")

      .set("Authorization", `Bearer ${customerToken}`)

      .send({ productId: product.id, quantity: 2 })

      .expect(201);

    await request(ctx.app.getHttpServer())
      .patch(`/api/v1/products/${product.id}`)

      .set("Authorization", `Bearer ${adminToken}`)

      .send({ stock: 1 })

      .expect(200);

    await request(ctx.app.getHttpServer())
      .post("/api/v1/orders/checkout")

      .set("Authorization", `Bearer ${customerToken}`)

      .expect(400);

    expect(ctx.orders).toHaveLength(0);

    expect(ctx.orderItems).toHaveLength(0);

    expect(ctx.findProduct(product.id)?.stock).toBe(1);
  });
});
