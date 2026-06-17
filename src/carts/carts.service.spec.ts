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
  const cartsRepository = {
    findActiveProduct: jest.fn(),
    findActiveCart: jest.fn(),
    createActiveCart: jest.fn(),
    createItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
  };
  let service: CartsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CartsService(cartsRepository as never);
  });

  it("merges quantity for same product", async () => {
    cartsRepository.findActiveProduct.mockResolvedValueOnce(product);
    cartsRepository.findActiveCart.mockResolvedValue(cart);
    cartsRepository.updateItem.mockResolvedValueOnce({
      ...cartItem,
      quantity: 3,
    });

    await service.addItem("user-1", { productId: product.id, quantity: 2 });

    expect(cartsRepository.updateItem).toHaveBeenCalledWith(cartItem.id, 3);
  });

  it("rejects inactive/missing product and insufficient stock", async () => {
    cartsRepository.findActiveProduct.mockResolvedValueOnce(null);
    await expect(
      service.addItem("user-1", { productId: product.id, quantity: 1 })
    ).rejects.toBeInstanceOf(NotFoundException);

    cartsRepository.findActiveProduct.mockResolvedValueOnce({
      ...product,
      stock: 1,
    });
    cartsRepository.findActiveCart.mockResolvedValueOnce(cart);
    await expect(
      service.addItem("user-1", { productId: product.id, quantity: 2 })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("throws not found when updating/removing missing item", async () => {
    cartsRepository.findActiveCart.mockResolvedValue({ ...cart, items: [] });

    await expect(
      service.updateItem("user-1", "missing", { quantity: 1 })
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.removeItem("user-1", "missing")
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
