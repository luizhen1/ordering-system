import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KafkaProducerService } from '../kafka/kafka.producer.service';
import { OrderCreatedEvent } from '../kafka/events/order-created.event';
import { RedisService } from '../redis/redis.service';
import { CreateOrderInput } from './dto/create-order.input';
import { UpdateOrderStatusInput } from './dto/update-order-status.input';
import { OrderItemModel } from './models/order-item.model';
import { OrderModel } from './models/order.model';
import { OrderStatus } from './models/order-status.enum';

type OrderWithRelations = Prisma.OrderGetPayload<{
  include: {
    user: true;
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

const orderInclude = {
  user: true,
  items: {
    include: {
      product: true,
    },
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly kafkaProducerService: KafkaProducerService,
  ) {}

  async create(input: CreateOrderInput): Promise<OrderModel> {
    const items = this.mergeDuplicatedItems(input.items);

    const order = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: {
          id: input.userId,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found.');
      }

      const products = await tx.product.findMany({
        where: {
          id: {
            in: items.map((item) => item.productId),
          },
        },
      });

      if (products.length !== items.length) {
        throw new NotFoundException('One or more products were not found.');
      }

      const productsById = new Map(
        products.map((product) => [product.id, product]),
      );

      let total = new Prisma.Decimal(0);
      const orderItems = items.map((item) => {
        const product = productsById.get(item.productId);

        if (!product) {
          throw new NotFoundException('Product not found.');
        }

        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for product ${product.name}.`,
          );
        }

        total = total.plus(product.price.mul(item.quantity));

        return {
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        };
      });

      const createdOrder = await tx.order.create({
        data: {
          userId: input.userId,
          total,
          items: {
            create: orderItems,
          },
        },
        include: orderInclude,
      });

      for (const item of items) {
        const stockUpdate = await tx.product.updateMany({
          where: {
            id: item.productId,
            stock: {
              gte: item.quantity,
            },
          },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        if (stockUpdate.count === 0) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId}.`,
          );
        }
      }

      return createdOrder;
    });

    await this.redisService.delByPattern('orders:*');
    await this.kafkaProducerService.publishOrderCreated(
      new OrderCreatedEvent(
        order.id,
        order.userId,
        Number(order.total),
        order.createdAt.toISOString(),
      ),
    );

    return this.toModel(order);
  }

  async findAll(): Promise<OrderModel[]> {
    const orders = await this.prisma.order.findMany({
      include: orderInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orders.map((order) => this.toModel(order));
  }

  async findById(id: string): Promise<OrderModel> {
    const cacheKey = this.getOrderCacheKey(id);
    const cached = await this.redisService.get<OrderModel>(cacheKey);

    if (cached) {
      return this.restoreOrderDates(cached);
    }

    const order = await this.prisma.order.findUnique({
      where: {
        id,
      },
      include: orderInclude,
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    const result = this.toModel(order);
    await this.redisService.set(cacheKey, result);

    return result;
  }

  async updateStatus(input: UpdateOrderStatusInput): Promise<OrderModel> {
    const existingOrder = await this.prisma.order.findUnique({
      where: {
        id: input.orderId,
      },
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found.');
    }

    const order = await this.prisma.order.update({
      where: {
        id: input.orderId,
      },
      data: {
        status: input.status,
      },
      include: orderInclude,
    });

    await this.redisService.del(this.getOrderCacheKey(input.orderId));

    return this.toModel(order);
  }

  private mergeDuplicatedItems(
    items: CreateOrderInput['items'],
  ): CreateOrderInput['items'] {
    const quantitiesByProduct = new Map<string, number>();

    for (const item of items) {
      quantitiesByProduct.set(
        item.productId,
        (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    return Array.from(quantitiesByProduct.entries()).map(
      ([productId, quantity]) => ({
        productId,
        quantity,
      }),
    );
  }

  private getOrderCacheKey(id: string): string {
    return `orders:${id}`;
  }

  private toModel(order: OrderWithRelations): OrderModel {
    return {
      ...order,
      status: order.status as OrderStatus,
      total: Number(order.total),
      items: order.items.map((item) => this.toOrderItemModel(item)),
    };
  }

  private toOrderItemModel(
    item: OrderWithRelations['items'][number],
  ): OrderItemModel {
    return {
      ...item,
      price: Number(item.price),
      product: item.product
          ? {
              ...item.product,
              description: item.product.description ?? undefined,
              price: Number(item.product.price),
            }
        : undefined,
    };
  }

  private restoreOrderDates(order: OrderModel): OrderModel {
    return {
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      user: order.user
        ? {
            ...order.user,
            createdAt: new Date(order.user.createdAt),
            updatedAt: new Date(order.user.updatedAt),
          }
        : undefined,
      items: order.items.map((item) => ({
        ...item,
        product: item.product
          ? {
              ...item.product,
              createdAt: new Date(item.product.createdAt),
              updatedAt: new Date(item.product.updatedAt),
            }
          : undefined,
      })),
    };
  }
}
