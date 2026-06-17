import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  CategoryListResponse,
  CategoryResponse,
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "./schemas/category.schema";
import { CategoriesRepository } from "./categories.repository";
import { toCategoryResponse } from "./categories.mapper";

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async findActive(query: ListCategoriesQuery): Promise<CategoryListResponse> {
    const [categories, total] = await Promise.all([
      this.categoriesRepository.findActive(query),
      this.categoriesRepository.countActive(),
    ]);

    return {
      data: categories.map((category) => toCategoryResponse(category)),
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

    return toCategoryResponse(category);
  }

  async existsActive(id: string): Promise<boolean> {
    const category = await this.categoriesRepository.findActiveById(id);

    return Boolean(category);
  }

  async create(input: CreateCategoryInput): Promise<CategoryResponse> {
    await this.ensureSlugAvailable(input.slug);

    const category = await this.categoriesRepository.create(input);

    return toCategoryResponse(category);
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

    return toCategoryResponse(updatedCategory);
  }

  async deactivate(id: string): Promise<CategoryResponse> {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException("Category not found");
    }

    const deactivatedCategory = await this.categoriesRepository.deactivate(id);

    return toCategoryResponse(deactivatedCategory);
  }

  private async ensureSlugAvailable(slug: string): Promise<void> {
    const existingCategory = await this.categoriesRepository.findBySlug(slug);

    if (existingCategory) {
      throw new ConflictException("Category slug already exists");
    }
  }
}
