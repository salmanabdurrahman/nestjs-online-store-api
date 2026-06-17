import { ConflictException, NotFoundException } from "@nestjs/common";
import { ProductsService } from "./products.service";

const now = new Date("2026-01-01T00:00:00.000Z");
const decimal = (value: number) => ({ toString: () => value.toFixed(2) });
const category = {
  id: "cat-1",
  name: "Books",
  slug: "books",
  description: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};
const product = {
  id: "prod-1",
  categoryId: category.id,
  name: "Book",
  slug: "book",
  description: null,
  price: decimal(10),
  stock: 5,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe("ProductsService", () => {
  const productsRepository = {
    findActive: jest.fn(),
    countActive: jest.fn(),
    findActiveById: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };
  const categoriesService = { existsActive: jest.fn() };
  let service: ProductsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProductsService(
      productsRepository as never,
      categoriesService as never
    );
  });

  it("delegates filters and returns pagination meta", async () => {
    const query = {
      page: 1,
      limit: 10,
      search: "book",
      categorySlug: "books",
      minPrice: 1,
      maxPrice: 20,
    };
    productsRepository.findActive.mockResolvedValueOnce([product]);
    productsRepository.countActive.mockResolvedValueOnce(1);

    await expect(service.findActive(query)).resolves.toMatchObject({
      data: [{ slug: "book", price: "10.00" }],
      meta: { total: 1, totalPages: 1 },
    });
    expect(productsRepository.findActive).toHaveBeenCalledWith(query);
    expect(productsRepository.countActive).toHaveBeenCalledWith(query);
  });

  it("rejects duplicate slug and inactive/missing category", async () => {
    productsRepository.findBySlug.mockResolvedValueOnce(product);
    await expect(
      service.create({
        categoryId: category.id,
        name: "Book",
        slug: "book",
        price: 10,
        stock: 1,
      })
    ).rejects.toBeInstanceOf(ConflictException);

    productsRepository.findBySlug.mockResolvedValueOnce(null);
    categoriesService.existsActive.mockResolvedValueOnce(false);
    await expect(
      service.create({
        categoryId: category.id,
        name: "Book",
        slug: "new-book",
        price: 10,
        stock: 1,
      })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("maps detail with category", async () => {
    productsRepository.findActiveById.mockResolvedValueOnce({
      ...product,
      category,
    });

    await expect(service.findActiveById(product.id)).resolves.toMatchObject({
      id: product.id,
      category: { id: category.id },
      price: "10.00",
    });
  });
});
