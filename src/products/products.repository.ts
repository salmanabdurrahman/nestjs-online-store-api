import { Injectable } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { ProductModel } from "../generated/prisma/models/Product";
import { PrismaService } from "../database/prisma.service";

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

export type ProductListQuery = {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
};

export type ProductCreateData = {
  categoryId: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  stock: number;
  isActive?: boolean;
};

export type ProductUpdateData = Partial<ProductCreateData>;

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(query: ProductListQuery): Promise<ProductModel[]> {
    return this.prisma.product.findMany({
      where: this.buildActiveWhere(query),
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }

  countActive(query: ProductListQuery): Promise<number> {
    return this.prisma.product.count({ where: this.buildActiveWhere(query) });
  }

  findActiveById(id: string): Promise<ProductWithCategory | null> {
    return this.prisma.product.findFirst({
      where: { id, isActive: true, category: { isActive: true } },
      include: { category: true },
    });
  }

  findById(id: string): Promise<ProductModel | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<ProductModel | null> {
    return this.prisma.product.findUnique({ where: { slug } });
  }

  create(data: ProductCreateData): Promise<ProductModel> {
    return this.prisma.product.create({ data });
  }

  update(id: string, data: ProductUpdateData): Promise<ProductModel> {
    return this.prisma.product.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<ProductModel> {
    return this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private buildActiveWhere(query: ProductListQuery): Prisma.ProductWhereInput {
    return {
      isActive: true,
      category: {
        isActive: true,
        ...(query.categorySlug ? { slug: query.categorySlug } : {}),
      },
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              {
                description: {
                  contains: query.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(query.minPrice !== undefined || query.maxPrice !== undefined
        ? {
            price: {
              ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
              ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
            },
          }
        : {}),
    };
  }
}
