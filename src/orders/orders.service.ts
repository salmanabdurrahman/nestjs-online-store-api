import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "../generated/prisma/enums";
import { toProductResponse } from "../products/products.mapper";
import type { AuthUser } from "../auth/auth.types";
import {
  ListOrdersQuery,
  OrderListResponse,
  OrderResponse,
  UpdateOrderStatusInput,
} from "./schemas/order.schema";
import {
  CartWithItems,
  OrdersRepository,
  OrderWithItems,
} from "./orders.repository";

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async checkout(userId: string): Promise<OrderResponse> {
    const order = await this.ordersRepository.checkout(userId, (cart) =>
      this.validateCheckoutCart(cart)
    );

    return this.toResponse(order);
  }

  async findAll(
    user: AuthUser,
    query: ListOrdersQuery
  ): Promise<OrderListResponse> {
    const [orders, total] = await Promise.all([
      this.ordersRepository.findMany(user, query),
      this.ordersRepository.count(user),
    ]);

    return {
      data: orders.map((order) => this.toResponse(order)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(user: AuthUser, id: string): Promise<OrderResponse> {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (user.role !== Role.ADMIN && order.userId !== user.sub) {
      throw new ForbiddenException("Order does not belong to user");
    }

    return this.toResponse(order);
  }

  async updateStatus(
    id: string,
    input: UpdateOrderStatusInput
  ): Promise<OrderResponse> {
    const order = await this.ordersRepository.exists(id);

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const updatedOrder = await this.ordersRepository.updateStatus(
      id,
      input.status
    );

    return this.toResponse(updatedOrder);
  }

  private validateCheckoutCart(cart: CartWithItems | null): CartWithItems {
    if (!cart) {
      throw new BadRequestException("Active cart not found");
    }

    if (cart.items.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    const hasInsufficientStock = cart.items.some(
      (item) => !item.product.isActive || item.product.stock < item.quantity
    );

    if (hasInsufficientStock) {
      throw new BadRequestException("Insufficient stock");
    }

    return cart;
  }

  private toResponse(order: OrderWithItems): OrderResponse {
    return {
      id: order.id,
      userId: order.userId,
      status: order.status,
      totalAmount: order.totalAmount.toString(),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceSnapshot: item.unitPriceSnapshot.toString(),
        subtotal: item.subtotal.toString(),
        product: toProductResponse(item.product),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
