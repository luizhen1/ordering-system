import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { UserModel } from '../../users/models/user.model';
import { OrderItemModel } from './order-item.model';
import { OrderStatus } from './order-status.enum';

@ObjectType()
export class OrderModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  userId: string;

  @Field(() => OrderStatus)
  status: OrderStatus;

  @Field(() => Float)
  total: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field(() => UserModel, { nullable: true })
  user?: UserModel;

  @Field(() => [OrderItemModel])
  items: OrderItemModel[];
}
