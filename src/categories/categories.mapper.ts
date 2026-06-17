import { CategoryModel } from "../generated/prisma/models/Category";
import { CategoryResponse } from "./schemas/category.schema";

export function toCategoryResponse(category: CategoryModel): CategoryResponse {
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
