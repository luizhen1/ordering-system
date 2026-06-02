import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateProductInput } from './dto/create-product.input';
import { ProductModel } from './models/product.model';
import { ProductsService } from './products.service';

@Resolver(() => ProductModel)
export class ProductsResolver {
  constructor(private readonly productsService: ProductsService) {}

  @Mutation(() => ProductModel)
  createProduct(
    @Args('input') input: CreateProductInput,
  ): Promise<ProductModel> {
    return this.productsService.create(input);
  }

  @Query(() => [ProductModel])
  findProducts(): Promise<ProductModel[]> {
    return this.productsService.findAll();
  }
}
