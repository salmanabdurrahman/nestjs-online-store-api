import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { toProductResponse } from "../products/products.mapper";
import {
  AddCartItemInput,
  CartResponse,
  UpdateCartItemInput,
} from "./schemas/cart.schema";
import { CartsRepository, CartWithItems } from "./carts.repository";

@Injectable()
export class CartsService {
  constructor(private readonly cartsRepository: CartsRepository) {}

  async getActiveCart(userId: string): Promise<CartResponse> {
    const cart = await this.findOrCreateActiveCart(userId);

    return this.toResponse(cart);
  }

  async addItem(
    userId: string,
    input: AddCartItemInput
  ): Promise<CartResponse> {
    const product = await this.cartsRepository.findActiveProduct(
      input.productId
    );

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
      await this.cartsRepository.updateItem(existingItem.id, nextQuantity);
    } else {
      await this.cartsRepository.createItem({
        cartId: cart.id,
        productId: product.id,
        quantity: input.quantity,
        unitPriceSnapshot: product.price,
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

    await this.cartsRepository.updateItem(item.id, input.quantity);

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

    await this.cartsRepository.deleteItem(item.id);

    return this.getActiveCart(userId);
  }

  private async findOrCreateActiveCart(userId: string): Promise<CartWithItems> {
    const existingCart = await this.findActiveCart(userId);

    if (existingCart) {
      return existingCart;
    }

    await this.cartsRepository.createActiveCart(userId);

    const cart = await this.findActiveCart(userId);

    if (!cart) {
      throw new BadRequestException("Unable to create cart");
    }

    return cart;
  }

  private findActiveCart(userId: string): Promise<CartWithItems | null> {
    return this.cartsRepository.findActiveCart(userId);
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
        product: toProductResponse(item.product),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
