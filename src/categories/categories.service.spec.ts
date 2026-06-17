import { ConflictException, NotFoundException } from "@nestjs/common";
import { CategoriesService } from "./categories.service";

const now = new Date("2026-01-01T00:00:00.000Z");
const category = {
  id: "cat-1",
  name: "Books",
  slug: "books",
  description: null,
  isActive: true,
  createdAt: now,
  updatedAt: now,
};

describe("CategoriesService", () => {
  const repository = {
    findActive: jest.fn(),
    countActive: jest.fn(),
    findActiveById: jest.fn(),
    findById: jest.fn(),
    findBySlug: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deactivate: jest.fn(),
  };
  let service: CategoriesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoriesService(repository as never);
  });

  it("returns pagination meta", async () => {
    repository.findActive.mockResolvedValueOnce([category]);
    repository.countActive.mockResolvedValueOnce(3);

    await expect(
      service.findActive({ page: 2, limit: 2 })
    ).resolves.toMatchObject({
      data: [{ id: category.id, slug: category.slug }],
      meta: { page: 2, limit: 2, total: 3, totalPages: 2 },
    });
  });

  it("rejects duplicate slug", async () => {
    repository.findBySlug.mockResolvedValueOnce(category);

    await expect(
      service.create({ name: "Books", slug: "books" })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("throws not found for missing detail", async () => {
    repository.findActiveById.mockResolvedValueOnce(null);

    await expect(service.findActiveById("missing")).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it("deactivates existing category", async () => {
    repository.findById.mockResolvedValueOnce(category);
    repository.deactivate.mockResolvedValueOnce({
      ...category,
      isActive: false,
    });

    await expect(service.deactivate(category.id)).resolves.toMatchObject({
      id: category.id,
      isActive: false,
    });
  });
});
