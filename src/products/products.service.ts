import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CategoryModel } from "../generated/prisma/models/Category";
import { ProductModel } from "../generated/prisma/models/Product";
import { CategoriesRepository } from "../categories/categories.repository";
import {
  CreateProductInput,
  ListProductsQuery,
  ProductDetailResponse,
  ProductListResponse,
  ProductResponse,
  UpdateProductInput,
} from "./schemas/product.schema";
import { ProductsRepository, ProductWithCategory } from "./products.repository";

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesRepository: CategoriesRepository
  ) {}

  async findActive(query: ListProductsQuery): Promise<ProductListResponse> {
    const [products, total] = await Promise.all([
      this.productsRepository.findActive(query),
      this.productsRepository.countActive(query),
    ]);

    return {
      data: products.map((product) => this.toResponse(product)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findActiveById(id: string): Promise<ProductDetailResponse> {
    const product = await this.productsRepository.findActiveById(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    return this.toDetailResponse(product);
  }

  async create(input: CreateProductInput): Promise<ProductResponse> {
    await this.ensureSlugAvailable(input.slug);
    await this.ensureCategoryActive(input.categoryId);

    const product = await this.productsRepository.create(input);

    return this.toResponse(product);
  }

  async update(
    id: string,
    input: UpdateProductInput
  ): Promise<ProductResponse> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    if (input.slug && input.slug !== product.slug) {
      await this.ensureSlugAvailable(input.slug);
    }

    if (input.categoryId && input.categoryId !== product.categoryId) {
      await this.ensureCategoryActive(input.categoryId);
    }

    const updatedProduct = await this.productsRepository.update(id, input);

    return this.toResponse(updatedProduct);
  }

  async deactivate(id: string): Promise<ProductResponse> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const deactivatedProduct = await this.productsRepository.deactivate(id);

    return this.toResponse(deactivatedProduct);
  }

  private async ensureSlugAvailable(slug: string): Promise<void> {
    const existingProduct = await this.productsRepository.findBySlug(slug);

    if (existingProduct) {
      throw new ConflictException("Product slug already exists");
    }
  }

  private async ensureCategoryActive(categoryId: string): Promise<void> {
    const category = await this.categoriesRepository.findActiveById(categoryId);

    if (!category) {
      throw new NotFoundException("Category not found");
    }
  }

  private toResponse(product: ProductModel): ProductResponse {
    return {
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock,
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }

  private toDetailResponse(
    product: ProductWithCategory
  ): ProductDetailResponse {
    return {
      ...this.toResponse(product),
      category: this.toCategoryResponse(product.category),
    };
  }

  private toCategoryResponse(category: CategoryModel) {
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
