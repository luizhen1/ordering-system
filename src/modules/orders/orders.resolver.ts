import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreateOrderInput } from './dto/create-order.input';
import { UpdateOrderStatusInput } from './dto/update-order-status.input';
import { OrderModel } from './models/order.model';
import { OrdersService } from './orders.service';

@Resolver(() => OrderModel)
export class OrdersResolver {
  constructor(private readonly ordersService: OrdersService) {}

  @Mutation(() => OrderModel)
  createOrder(@Args('input') input: CreateOrderInput): Promise<OrderModel> {
    return this.ordersService.create(input);
  }

  @Query(() => [OrderModel])
  findOrders(): Promise<OrderModel[]> {
    return this.ordersService.findAll();
  }

  @Query(() => OrderModel)
  findOrderById(@Args('id') id: string): Promise<OrderModel> {
    return this.ordersService.findById(id);
  }

  @Mutation(() => OrderModel)
  updateOrderStatus(
    @Args('input') input: UpdateOrderStatusInput,
  ): Promise<OrderModel> {
    return this.ordersService.updateStatus(input);
  }
}
