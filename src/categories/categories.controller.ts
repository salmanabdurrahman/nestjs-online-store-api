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
import { ApiErrorResponses } from "../common/decorators/api-error-responses.decorator";
import { Role } from "../generated/prisma/enums";
import { Roles } from "../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { CategoriesService } from "./categories.service";
import {
  CategoryListResponseDto,
  CategoryResponseDto,
  CreateCategoryDto,
  ListCategoriesQueryDto,
  UpdateCategoryDto,
} from "./schemas/category.schema";

@ApiTags("Categories")
@ApiErrorResponses([400, 401, 403, 404, 409])
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ZodSerializerDto(CategoryListResponseDto)
  @ApiOkResponse({ type: CategoryListResponseDto })
  findAll(@Query() query: ListCategoriesQueryDto) {
    return this.categoriesService.findActive(query);
  }

  @Get(":id")
  @ZodSerializerDto(CategoryResponseDto)
  @ApiOkResponse({ type: CategoryResponseDto })
  findOne(@Param("id") id: string) {
    return this.categoriesService.findActiveById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("bearer")
  @ZodSerializerDto(CategoryResponseDto)
  @ApiCreatedResponse({ type: CategoryResponseDto })
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(body);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("bearer")
  @ZodSerializerDto(CategoryResponseDto)
  @ApiOkResponse({ type: CategoryResponseDto })
  update(@Param("id") id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.update(id, body);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth("bearer")
  @ZodSerializerDto(CategoryResponseDto)
  @ApiOkResponse({ type: CategoryResponseDto })
  remove(@Param("id") id: string) {
    return this.categoriesService.deactivate(id);
  }
}
