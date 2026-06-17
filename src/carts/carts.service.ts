import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CartStatus } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../database/prisma.service";
import {
  AddCartItemInput,
  CartResponse,
  UpdateCartItemInput,
} from "./schemas/cart.schema";

type CartWithItems = Prisma.CartGetPayload<{
  include: { items: { include: { product: true } } };
}>;

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveCart(userId: string): Promise<CartResponse> {
    const cart = await this.findOrCreateActiveCart(userId);

    return this.toResponse(cart);
  }

  async addItem(
    userId: string,
    input: AddCartItemInput
  ): Promise<CartResponse> {
    const product = await this.prisma.product.findFirst({
      where: {
        id: input.productId,
        isActive: true,
        category: { isActive: true },
      },
    });

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    const cart = await this.findOrCreateActiveCart(userId);
    const existingItem = cart.items.find(
      (item) => item.productId === input.productId
    );
    const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;

    this.ensureStockAvailable(product.stock, nextQuantity);

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: nextQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          quantity: input.quantity,
          unitPriceSnapshot: product.price,
        },
      });
    }

    return this.getActiveCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    input: UpdateCartItemInput
  ): Promise<CartResponse> {
    const cart = await this.findOrCreateActiveCart(userId);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);

    if (!item) {
      throw new NotFoundException("Cart item not found");
    }

    if (!item.product.isActive) {
      throw new BadRequestException("Product is inactive");
    }

    this.ensureStockAvailable(item.product.stock, input.quantity);

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: input.quantity },
    });

    return this.getActiveCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartResponse> {
    const cart = await this.findOrCreateActiveCart(userId);
    const item = cart.items.find((cartItem) => cartItem.id === itemId);

    if (!item) {
      throw new NotFoundException("Cart item not found");
    }

    if (item.cartId !== cart.id) {
      throw new ForbiddenException("Cart item does not belong to active cart");
    }

    await this.prisma.cartItem.delete({ where: { id: item.id } });

    return this.getActiveCart(userId);
  }

  private async findOrCreateActiveCart(userId: string): Promise<CartWithItems> {
    const existingCart = await this.findActiveCart(userId);

    if (existingCart) {
      return existingCart;
    }

    await this.prisma.cart.create({
      data: { userId, status: CartStatus.ACTIVE },
    });

    const cart = await this.findActiveCart(userId);

    if (!cart) {
      throw new BadRequestException("Unable to create cart");
    }

    return cart;
  }

  private findActiveCart(userId: string): Promise<CartWithItems | null> {
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

  private ensureStockAvailable(stock: number, quantity: number): void {
    if (stock < quantity) {
      throw new BadRequestException("Insufficient stock");
    }
  }

  private toResponse(cart: CartWithItems): CartResponse {
    return {
      id: cart.id,
      userId: cart.userId,
      status: cart.status,
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPriceSnapshot: item.unitPriceSnapshot.toString(),
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
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
