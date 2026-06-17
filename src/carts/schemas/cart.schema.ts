import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { productResponseSchema } from "../../products/schemas/product.schema";

export const cartItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPriceSnapshot: z.string(),
  product: productResponseSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const cartResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.enum(["ACTIVE", "CHECKED_OUT", "ABANDONED"]),
  items: z.array(cartItemResponseSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const addCartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
});

export const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().positive(),
});

export class AddCartItemDto extends createZodDto(addCartItemSchema) {}
export class UpdateCartItemDto extends createZodDto(updateCartItemSchema) {}
export class CartResponseDto extends createZodDto(cartResponseSchema) {}

export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type CartResponse = z.infer<typeof cartResponseSchema>;
