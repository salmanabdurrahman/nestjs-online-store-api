import { createZodDto } from "nestjs-zod";
import { z } from "zod";
import { productResponseSchema } from "../../products/schemas/product.schema";

export const orderStatusSchema = z.enum([
  "PENDING",
  "PAID",
  "CANCELLED",
  "FULFILLED",
]);

export const orderItemResponseSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  unitPriceSnapshot: z.string(),
  subtotal: z.string(),
  product: productResponseSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const orderResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: orderStatusSchema,
  totalAmount: z.string(),
  items: z.array(orderItemResponseSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const orderListResponseSchema = z.object({
  data: z.array(orderResponseSchema),
  meta: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
});

export class ListOrdersQueryDto extends createZodDto(listOrdersQuerySchema) {}
export class OrderResponseDto extends createZodDto(orderResponseSchema) {}
export class OrderListResponseDto extends createZodDto(
  orderListResponseSchema
) {}
export class UpdateOrderStatusDto extends createZodDto(
  updateOrderStatusSchema
) {}

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type OrderResponse = z.infer<typeof orderResponseSchema>;
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
