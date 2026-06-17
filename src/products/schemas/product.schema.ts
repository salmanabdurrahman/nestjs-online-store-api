import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { categoryResponseSchema } from "../../categories/schemas/category.schema";

export const productResponseSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  price: z.string(),
  stock: z.number().int().nonnegative(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const productDetailResponseSchema = productResponseSchema.extend({
  category: categoryResponseSchema,
});

export const productListResponseSchema = z.object({
  data: z.array(productResponseSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL friendly");

export const createProductSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(150),
  slug: slugSchema.optional(),
  description: z.string().max(1000).optional(),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().nonnegative(),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one field is required"
  );

export const listProductsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    search: z.string().min(1).max(100).optional(),
    categoryId: z.string().uuid().optional(),
    categorySlug: slugSchema.optional(),
    minPrice: z.coerce.number().positive().optional(),
    maxPrice: z.coerce.number().positive().optional(),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    {
      message: "minPrice must be less than or equal to maxPrice",
      path: ["minPrice"],
    }
  );

export class CreateProductDto extends createZodDto(createProductSchema) {}
export class UpdateProductDto extends createZodDto(updateProductSchema) {}
export class ListProductsQueryDto extends createZodDto(
  listProductsQuerySchema
) {}
export class ProductResponseDto extends createZodDto(productResponseSchema) {}
export class ProductDetailResponseDto extends createZodDto(
  productDetailResponseSchema
) {}
export class ProductListResponseDto extends createZodDto(
  productListResponseSchema
) {}

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type ProductResponse = z.infer<typeof productResponseSchema>;
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;
export type ProductListResponse = z.infer<typeof productListResponseSchema>;
