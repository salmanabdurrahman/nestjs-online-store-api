import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { ApiErrorResponses } from "../common/decorators/api-error-responses.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import type { AuthUser } from "../auth/auth.types";
import { CartsService } from "./carts.service";
import {
  AddCartItemDto,
  CartResponseDto,
  UpdateCartItemDto,
} from "./schemas/cart.schema";

@ApiTags("Cart")
@ApiErrorResponses([400, 401, 403, 404])
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("cart")
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @ZodSerializerDto(CartResponseDto)
  @ApiOkResponse({ type: CartResponseDto })
  findActive(@CurrentUser() user: AuthUser) {
    return this.cartsService.getActiveCart(user.sub);
  }

  @Post("items")
  @ZodSerializerDto(CartResponseDto)
  @ApiCreatedResponse({ type: CartResponseDto })
  addItem(@CurrentUser() user: AuthUser, @Body() body: AddCartItemDto) {
    return this.cartsService.addItem(user.sub, body);
  }

  @Patch("items/:id")
  @ZodSerializerDto(CartResponseDto)
  @ApiOkResponse({ type: CartResponseDto })
  updateItem(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() body: UpdateCartItemDto
  ) {
    return this.cartsService.updateItem(user.sub, id, body);
  }

  @Delete("items/:id")
  @ZodSerializerDto(CartResponseDto)
  @ApiOkResponse({ type: CartResponseDto })
  removeItem(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.cartsService.removeItem(user.sub, id);
  }
}
