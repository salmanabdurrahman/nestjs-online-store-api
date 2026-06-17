import { BadRequestException, NotFoundException } from "@nestjs/common";
import { CartStatus } from "../generated/prisma/enums";
import { CartsService } from "./carts.service";

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
const cartItem = {
  id: "item-1",
  cartId: "cart-1",
  productId: product.id,
  quantity: 1,
  unitPriceSnapshot: decimal(10),
  product,
  createdAt: now,
  updatedAt: now,
};
const cart = {
  id: "cart-1",
  userId: "user-1",
  status: CartStatus.ACTIVE,
  items: [cartItem],
  createdAt: now,
  updatedAt: now,
};

describe("CartsService", () => {
  const prisma = {
    product: { findFirst: jest.fn() },
    cart: { findFirst: jest.fn(), create: jest.fn() },
    cartItem: { create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };
  let service: CartsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CartsService(prisma as never);
  });

  it("merges quantity for same product", async () => {
    prisma.product.findFirst.mockResolvedValueOnce(product);
    prisma.cart.findFirst.mockResolvedValue(cart);
    prisma.cartItem.update.mockResolvedValueOnce({ ...cartItem, quantity: 3 });

    await service.addItem("user-1", { productId: product.id, quantity: 2 });

    expect(prisma.cartItem.update).toHaveBeenCalledWith({
      where: { id: cartItem.id },
      data: { quantity: 3 },
    });
  });

  it("rejects inactive/missing product and insufficient stock", async () => {
    prisma.product.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.addItem("user-1", { productId: product.id, quantity: 1 })
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.product.findFirst.mockResolvedValueOnce({ ...product, stock: 1 });
    prisma.cart.findFirst.mockResolvedValueOnce(cart);
    await expect(
      service.addItem("user-1", { productId: product.id, quantity: 2 })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws not found when updating/removing missing item", async () => {
    prisma.cart.findFirst.mockResolvedValue({ ...cart, items: [] });

    await expect(
      service.updateItem("user-1", "missing", { quantity: 1 })
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.removeItem("user-1", "missing")
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
