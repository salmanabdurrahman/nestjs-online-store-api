import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";
import { Role } from "../generated/prisma/enums";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { ProductsService } from "./products.service";
import {
  CreateProductDto,
  ListProductsQueryDto,
  ProductDetailResponseDto,
  ProductListResponseDto,
  ProductResponseDto,
  UpdateProductDto,
} from "./schemas/product.schema";

@ApiTags("Products")
@Controller("products")
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ZodSerializerDto(ProductListResponseDto)
  @ApiOkResponse({ type: ProductListResponseDto })
  findAll(@Query() query: ListProductsQueryDto) {
    return this.productsService.findActive(query);
  }

  @Get(":id")
  @ZodSerializerDto(ProductDetailResponseDto)
  @ApiOkResponse({ type: ProductDetailResponseDto })
  findOne(@Param("id") id: string) {
    return this.productsService.findActiveById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("bearer")
  @ZodSerializerDto(ProductResponseDto)
  @ApiCreatedResponse({ type: ProductResponseDto })
  create(@Body() body: CreateProductDto) {
    return this.productsService.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("bearer")
  @ZodSerializerDto(ProductResponseDto)
  @ApiOkResponse({ type: ProductResponseDto })
  update(@Param("id") id: string, @Body() body: UpdateProductDto) {
    return this.productsService.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("bearer")
  @ZodSerializerDto(ProductResponseDto)
  @ApiOkResponse({ type: ProductResponseDto })
  remove(@Param("id") id: string) {
    return this.productsService.deactivate(id);
  }
}
