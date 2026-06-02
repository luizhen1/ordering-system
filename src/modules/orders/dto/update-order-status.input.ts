import { Field, ID, InputType } from '@nestjs/graphql';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OrderStatus } from '../models/order-status.enum';

@InputType()
export class UpdateOrderStatusInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @Field(() => OrderStatus)
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
