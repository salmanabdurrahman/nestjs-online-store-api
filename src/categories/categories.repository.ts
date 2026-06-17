import { Injectable } from "@nestjs/common";
import { CategoryModel } from "../generated/prisma/models/Category";
import { PrismaService } from "../database/prisma.service";

export type CategoryListQuery = {
  page: number;
  limit: number;
};

export type CategoryCreateData = {
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
};

export type CategoryUpdateData = Partial<CategoryCreateData>;

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActive(query: CategoryListQuery): Promise<CategoryModel[]> {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }

  countActive(): Promise<number> {
    return this.prisma.category.count({ where: { isActive: true } });
  }

  findActiveById(id: string): Promise<CategoryModel | null> {
    return this.prisma.category.findFirst({ where: { id, isActive: true } });
  }

  findById(id: string): Promise<CategoryModel | null> {
    return this.prisma.category.findUnique({ where: { id } });
  }

  findBySlug(slug: string): Promise<CategoryModel | null> {
    return this.prisma.category.findUnique({ where: { slug } });
  }

  create(data: CategoryCreateData): Promise<CategoryModel> {
    return this.prisma.category.create({ data });
  }

  update(id: string, data: CategoryUpdateData): Promise<CategoryModel> {
    return this.prisma.category.update({ where: { id }, data });
  }

  deactivate(id: string): Promise<CategoryModel> {
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
