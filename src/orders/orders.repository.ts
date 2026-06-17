import { BadRequestException, Injectable } from "@nestjs/common";
import { CartStatus, OrderStatus, Role } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import type { AuthUser } from "../auth/auth.types";

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: { items: { include: { product: true } } };
}>;

export type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: { product: true } } };
}>;

export type ListOrdersQuery = {
  page: number;
  limit: number;
};

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  checkout(
    userId: string,
    validateCart: (cart: CartWithItems | null) => CartWithItems
  ) {
    return this.prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findFirst({
        where: { userId, status: CartStatus.ACTIVE },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
            include: { product: true },
          },
        },
      });

      const checkedCart = validateCart(cart);
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
  }

  findMany(user: AuthUser, query: ListOrdersQuery): Promise<OrderWithItems[]> {
    return this.prisma.order.findMany({
      where: user.role === Role.ADMIN ? undefined : { userId: user.sub },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
      include: { items: { include: { product: true } } },
    });
  }

  count(user: AuthUser): Promise<number> {
    return this.prisma.order.count({
      where: user.role === Role.ADMIN ? undefined : { userId: user.sub },
    });
  }

  findById(id: string): Promise<OrderWithItems | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } } },
    });
  }

  exists(id: string) {
    return this.prisma.order.findUnique({ where: { id } });
  }

  updateStatus(id: string, status: OrderStatus): Promise<OrderWithItems> {
    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    });
  }
}
