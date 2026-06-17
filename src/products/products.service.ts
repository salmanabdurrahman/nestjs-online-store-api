import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CategoriesService } from "../categories/categories.service";
import {
  CreateProductInput,
  ListProductsQuery,
  ProductDetailResponse,
  ProductListResponse,
  ProductResponse,
  UpdateProductInput,
} from "./schemas/product.schema";
import { ProductsRepository } from "./products.repository";
import { toProductDetailResponse, toProductResponse } from "./products.mapper";
import { createSlug, createSlugWithRandomSuffix } from "../common/utils/slug";

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly categoriesService: CategoriesService
  ) {}

  async findActive(query: ListProductsQuery): Promise<ProductListResponse> {
    const [products, total] = await Promise.all([
      this.productsRepository.findActive(query),
      this.productsRepository.countActive(query),
    ]);

    return {
      data: products.map((product) => toProductResponse(product)),
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

    return toProductDetailResponse(product);
  }

  async create(input: CreateProductInput): Promise<ProductResponse> {
    const slug = input.slug ?? (await this.generateAvailableSlug(input.name));

    if (input.slug) {
      await this.ensureSlugAvailable(input.slug);
    }

    await this.ensureCategoryActive(input.categoryId);

    const product = await this.productsRepository.create({ ...input, slug });

    return toProductResponse(product);
  }

  async update(
    id: string,
    input: UpdateProductInput
  ): Promise<ProductResponse> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const slug = input.slug
      ? input.slug
      : input.name
        ? await this.generateAvailableSlug(input.name, product.id)
        : undefined;

    if (input.slug && input.slug !== product.slug) {
      await this.ensureSlugAvailable(input.slug);
    }

    if (input.categoryId && input.categoryId !== product.categoryId) {
      await this.ensureCategoryActive(input.categoryId);
    }

    const updatedProduct = await this.productsRepository.update(id, {
      ...input,
      ...(slug ? { slug } : {}),
    });

    return toProductResponse(updatedProduct);
  }

  async deactivate(id: string): Promise<ProductResponse> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const deactivatedProduct = await this.productsRepository.deactivate(id);

    return toProductResponse(deactivatedProduct);
  }

  private async ensureSlugAvailable(slug: string): Promise<void> {
    const existingProduct = await this.productsRepository.findBySlug(slug);

    if (existingProduct) {
      throw new ConflictException("Product slug already exists");
    }
  }

  private async generateAvailableSlug(
    name: string,
    ignoredId?: string
  ): Promise<string> {
    const slug = createSlug(name);
    const existingProduct = await this.productsRepository.findBySlug(slug);

    if (!existingProduct || existingProduct.id === ignoredId) {
      return slug;
    }

    let candidate = createSlugWithRandomSuffix(slug);
    while (await this.productsRepository.findBySlug(candidate)) {
      candidate = createSlugWithRandomSuffix(slug);
    }

    return candidate;
  }

  private async ensureCategoryActive(categoryId: string): Promise<void> {
    const categoryExists =
      await this.categoriesService.existsActive(categoryId);

    if (!categoryExists) {
      throw new NotFoundException("Category not found");
    }
  }
}
