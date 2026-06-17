import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CartStatus, OrderStatus, Role } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { AuthUser } from "../auth/auth.types";
import {
  OrderListResponse,
  OrderResponse,
  UpdateOrderStatusInput,
} from "./schemas/order.schema";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;

type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: { product: true } } };
}>;

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(userId: string): Promise<OrderResponse> {
    const order = await this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, status: CartStatus.ACTIVE },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
            include: { product: true },
          },
        },
      });

      this.validateCheckoutCart(cart);

      const checkedCart = cart as CartWithItems;
      const totalAmount = checkedCart.items.reduce(
        (total, item) =>
          total.add(
            new Prisma.Decimal(item.unitPriceSnapshot.toString()).mul(
              item.quantity
            )
          ),
        new Prisma.Decimal(0)
      );

      const createdOrder = await tx.order.create({
        data: {
          userId,
          status: OrderStatus.PENDING,
          totalAmount,
          items: {
            create: checkedCart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceSnapshot: item.unitPriceSnapshot,
              subtotal: new Prisma.Decimal(
                item.unitPriceSnapshot.toString()
              ).mul(item.quantity),
            })),
          },
        },
        include: { items: { include: { product: true } } },
      });

      const stockUpdates = await Promise.all(
        checkedCart.items.map((item) =>
          tx.product.updateMany({
            where: {
              id: item.productId,
              isActive: true,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          })
        )
      );

      if (stockUpdates.some((result) => result.count !== 1)) {
        throw new BadRequestException("Insufficient stock");
      }

      await tx.cart.update({
        where: { id: checkedCart.id },
        data: { status: CartStatus.CHECKED_OUT },
      });

      return createdOrder;
    });

    return this.toResponse(order);
  }

  async findAll(user: AuthUser): Promise<OrderListResponse> {
    const orders = await this.prisma.order.findMany({
      where: user.role === Role.ADMIN ? undefined : { userId: user.sub },
      orderBy: { createdAt: "desc" },
      include: { items: { include: { product: true } } },
    });

    return { data: orders.map((order) => this.toResponse(order)) };
  }

  async findOne(user: AuthUser, id: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });

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
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: input.status },
      include: { items: { include: { product: true } } },
    });

    return this.toResponse(updatedOrder);
  }

  private validateCheckoutCart(cart: CartWithItems | null): void {
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
        product: {
          id: item.product.id,
          categoryId: item.product.categoryId,
          name: item.product.name,
          slug: item.product.slug,
          description: item.product.description,
          price: item.product.price.toString(),
          stock: item.product.stock,
          isActive: item.product.isActive,
          createdAt: item.product.createdAt.toISOString(),
          updatedAt: item.product.updatedAt.toISOString(),
        },
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}
