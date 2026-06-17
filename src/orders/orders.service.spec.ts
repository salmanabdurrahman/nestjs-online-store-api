import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { CartStatus, OrderStatus, Role } from "../generated/prisma/enums";
import { OrdersService } from "./orders.service";

const now = new Date("2026-01-01T00:00:00.000Z");
const decimal = (value: number) => ({ toString: () => value.toFixed(2) });
const product = {
  id: "prod-1",
  categoryId: "cat-1",
  name: "Book",
  slug: "book",
  description: null,
  price: decimal(10),
  stock: 3,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};
const cart = {
  id: "cart-1",
  userId: "user-1",
  status: CartStatus.ACTIVE,
  items: [
    {
      id: "item-1",
      cartId: "cart-1",
      productId: product.id,
      quantity: 2,
      unitPriceSnapshot: decimal(10),
      product,
      createdAt: now,
      updatedAt: now,
    },
  ],
  createdAt: now,
  updatedAt: now,
};
const order = {
  id: "order-1",
  userId: "user-1",
  status: OrderStatus.PENDING,
  totalAmount: decimal(20),
  items: [
    {
      id: "order-item-1",
      orderId: "order-1",
      productId: product.id,
      quantity: 2,
      unitPriceSnapshot: decimal(10),
      subtotal: decimal(20),
      product,
      createdAt: now,
      updatedAt: now,
    },
  ],
  createdAt: now,
  updatedAt: now,
};

describe("OrdersService", () => {
  const tx = {
    cart: { findFirst: jest.fn(), update: jest.fn() },
    order: { create: jest.fn() },
    product: { updateMany: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx)
    ),
    order: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  };
  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrdersService(prisma as never);
  });

  it("checks out cart transaction and marks cart checked out", async () => {
    tx.cart.findFirst.mockResolvedValueOnce(cart);
    tx.order.create.mockResolvedValueOnce(order);
    tx.product.updateMany.mockResolvedValueOnce({ count: 1 });

    await expect(service.checkout("user-1")).resolves.toMatchObject({
      id: order.id,
      totalAmount: "20.00",
    });
    expect(tx.cart.update).toHaveBeenCalledWith({
      where: { id: cart.id },
      data: { status: CartStatus.CHECKED_OUT },
    });
  });

  it("rejects empty cart and insufficient stock without partial order", async () => {
    tx.cart.findFirst.mockResolvedValueOnce({ ...cart, items: [] });
    await expect(service.checkout("user-1")).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(tx.order.create).not.toHaveBeenCalled();

    tx.cart.findFirst.mockResolvedValueOnce(cart);
    tx.order.create.mockResolvedValueOnce(order);
    tx.product.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.checkout("user-1")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("guards ownership and updates status", async () => {
    prisma.order.findUnique.mockResolvedValueOnce(order);
    await expect(
      service.findOne(
        { sub: "other-user", email: "other@example.com", role: Role.CUSTOMER },
        order.id
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    prisma.order.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.updateStatus("missing", { status: OrderStatus.PAID })
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.order.findUnique.mockResolvedValueOnce(order);
    prisma.order.update.mockResolvedValueOnce({
      ...order,
      status: OrderStatus.PAID,
    });
    await expect(
      service.updateStatus(order.id, { status: OrderStatus.PAID })
    ).resolves.toMatchObject({ status: OrderStatus.PAID });
  });
});
