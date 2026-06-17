import { Module } from "@nestjs/common";
import { CategoriesRepository } from "../categories/categories.repository";
import { ProductsController } from "./products.controller";
import { ProductsRepository } from "./products.repository";
import { ProductsService } from "./products.service";

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository, CategoriesRepository],
})
export class ProductsModule {}
