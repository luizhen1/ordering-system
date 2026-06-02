import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';
import { ProductModel } from '../../products/models/product.model';

@ObjectType()
export class OrderItemModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  orderId: string;

  @Field(() => ID)
  productId: string;

  @Field(() => Int)
  quantity: number;

  @Field(() => Float)
  price: number;

  @Field(() => ProductModel, { nullable: true })
  product?: ProductModel;
}
