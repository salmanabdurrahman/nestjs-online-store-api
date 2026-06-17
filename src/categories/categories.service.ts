import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CategoryModel } from "../generated/prisma/models/Category";
import {
  CategoryListResponse,
  CategoryResponse,
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "./schemas/category.schema";
import { CategoriesRepository } from "./categories.repository";

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findActive(query: ListCategoriesQuery): Promise<CategoryListResponse> {
    const [categories, total] = await Promise.all([
      this.categoriesRepository.findActive(query),
      this.categoriesRepository.countActive(),
    ]);

    return {
      data: categories.map((category) => this.toResponse(category)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findActiveById(id: string): Promise<CategoryResponse> {
    const category = await this.categoriesRepository.findActiveById(id);

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    return this.toResponse(category);
  }

  async create(input: CreateCategoryInput): Promise<CategoryResponse> {
    await this.ensureSlugAvailable(input.slug);

    const category = await this.categoriesRepository.create(input);

    return this.toResponse(category);
  }

  async update(
    id: string,
    input: UpdateCategoryInput
  ): Promise<CategoryResponse> {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    if (input.slug && input.slug !== category.slug) {
      await this.ensureSlugAvailable(input.slug);
    }

    const updatedCategory = await this.categoriesRepository.update(id, input);

    return this.toResponse(updatedCategory);
  }

  async deactivate(id: string): Promise<CategoryResponse> {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    const deactivatedCategory = await this.categoriesRepository.deactivate(id);

    return this.toResponse(deactivatedCategory);
  }

  private async ensureSlugAvailable(slug: string): Promise<void> {
    const existingCategory = await this.categoriesRepository.findBySlug(slug);

    if (existingCategory) {
      throw new ConflictException("Category slug already exists");
    }
  }

  private toResponse(category: CategoryModel): CategoryResponse {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
    };
  }
}
