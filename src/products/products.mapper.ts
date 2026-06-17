import { CategoryModel } from "../generated/prisma/models/Category";
import { ProductModel } from "../generated/prisma/models/Product";
import { toCategoryResponse } from "../categories/categories.mapper";
import {
  ProductDetailResponse,
  ProductResponse,
} from "./schemas/product.schema";

export type ProductWithCategoryModel = ProductModel & {
  category: CategoryModel;
};

export function toProductResponse(product: ProductModel): ProductResponse {
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

export function toProductDetailResponse(
  product: ProductWithCategoryModel
): ProductDetailResponse {
  return {
    ...toProductResponse(product),
    category: toCategoryResponse(product.category),
  };
}
