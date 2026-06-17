/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
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
  const ordersRepository = {
    checkout: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findById: jest.fn(),
    exists: jest.fn(),
    updateStatus: jest.fn(),
  };
  let service: OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrdersService(ordersRepository as never);
  });

  it("checks out cart through repository", async () => {
    ordersRepository.checkout.mockImplementationOnce(
      (_userId, validateCart) => {
        validateCart(cart);
        return order;
      }
    );

    await expect(service.checkout("user-1")).resolves.toMatchObject({
      id: order.id,
      totalAmount: "20.00",
    });
    expect(ordersRepository.checkout).toHaveBeenCalledWith(
      "user-1",
      expect.any(Function)
    );
  });

  it("rejects empty cart and insufficient stock", async () => {
    ordersRepository.checkout.mockImplementationOnce((_userId, validateCart) =>
      validateCart({ ...cart, items: [] })
    );
    await expect(service.checkout("user-1")).rejects.toBeInstanceOf(
      BadRequestException
    );

    ordersRepository.checkout.mockRejectedValueOnce(
      new BadRequestException("Insufficient stock")
    );
    await expect(service.checkout("user-1")).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it("returns paginated order list", async () => {
    ordersRepository.findMany.mockResolvedValueOnce([order]);
    ordersRepository.count.mockResolvedValueOnce(1);

    await expect(
      service.findAll(
        { sub: "user-1", email: "user@example.com", role: Role.CUSTOMER },
        { page: 1, limit: 10 }
      )
    ).resolves.toMatchObject({
      data: [{ id: order.id }],
      meta: { total: 1, totalPages: 1 },
    });
  });

  it("guards ownership and updates status", async () => {
    ordersRepository.findById.mockResolvedValueOnce(order);
    await expect(
      service.findOne(
        { sub: "other-user", email: "other@example.com", role: Role.CUSTOMER },
        order.id
      )
    ).rejects.toBeInstanceOf(ForbiddenException);

    ordersRepository.exists.mockResolvedValueOnce(null);
    await expect(
      service.updateStatus("missing", { status: OrderStatus.PAID })
    ).rejects.toBeInstanceOf(NotFoundException);

    ordersRepository.exists.mockResolvedValueOnce(order);
    ordersRepository.updateStatus.mockResolvedValueOnce({
      ...order,
      status: OrderStatus.PAID,
    });
    await expect(
      service.updateStatus(order.id, { status: OrderStatus.PAID })
    ).resolves.toMatchObject({ status: OrderStatus.PAID });
  });
});
