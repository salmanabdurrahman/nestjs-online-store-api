import {
  Body,
  Controller,
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
import type { AuthUser } from "../auth/auth.types";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Role } from "../generated/prisma/enums";
import { OrdersService } from "./orders.service";
import {
  OrderListResponseDto,
  OrderResponseDto,
  UpdateOrderStatusDto,
} from "./schemas/order.schema";

@ApiTags("Orders")
@ApiBearerAuth("bearer")
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post("checkout")
  @ZodSerializerDto(OrderResponseDto)
  @ApiCreatedResponse({ type: OrderResponseDto })
  checkout(@CurrentUser() user: AuthUser) {
    return this.ordersService.checkout(user.sub);
  }

  @Get()
  @ZodSerializerDto(OrderListResponseDto)
  @ApiOkResponse({ type: OrderListResponseDto })
  findAll(@CurrentUser() user: AuthUser) {
    return this.ordersService.findAll(user);
  }

  @Get(":id")
  @ZodSerializerDto(OrderResponseDto)
  @ApiOkResponse({ type: OrderResponseDto })
  findOne(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.ordersService.findOne(user, id);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ZodSerializerDto(OrderResponseDto)
  @ApiOkResponse({ type: OrderResponseDto })
  updateStatus(@Param("id") id: string, @Body() body: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, body);
  }
}
