import { Injectable } from "@nestjs/common";
import { CartStatus } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { ProductModel } from "../generated/prisma/models/Product";
import { PrismaService } from "../database/prisma.service";

export type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: { product: true } } };
}>;

@Injectable()
export class CartsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveProduct(productId: string): Promise<ProductModel | null> {
    return this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
        category: { isActive: true },
      },
    });
  }

  findActiveCart(userId: string): Promise<CartWithItems | null> {
    return this.prisma.cart.findFirst({
      where: { userId, status: CartStatus.ACTIVE },
      include: {
        items: {
          orderBy: { createdAt: "asc" },
          include: { product: true },
        },
      },
    });
  }

  createActiveCart(userId: string) {
    return this.prisma.cart.create({
      data: { userId, status: CartStatus.ACTIVE },
    });
  }

  createItem(data: {
    cartId: string;
    productId: string;
    quantity: number;
    unitPriceSnapshot: Prisma.Decimal | number;
  }) {
    return this.prisma.cartItem.create({ data });
  }

  updateItem(id: string, quantity: number) {
    return this.prisma.cartItem.update({
      where: { id },
      data: { quantity },
    });
  }

  deleteItem(id: string) {
    return this.prisma.cartItem.delete({ where: { id } });
  }
}
