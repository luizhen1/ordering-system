import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Consumer, EachMessagePayload, Kafka } from 'kafkajs';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus } from '../orders/models/order-status.enum';
import { RedisService } from '../redis/redis.service';
import { OrderCreatedEvent } from './events/order-created.event';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name);
  private readonly consumer: Consumer;
  private readonly orderCreatedTopic: string;
  private connected = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    const kafka = new Kafka({
      clientId: this.configService.get<string>('kafka.clientId', 'ordering-system'),
      brokers: this.configService.get<string[]>('kafka.brokers', ['localhost:29092']),
    });

    this.consumer = kafka.consumer({
      groupId: this.configService.get<string>(
        'kafka.groupId',
        'ordering-system-consumer',
      ),
    });
    this.orderCreatedTopic = this.configService.get<string>(
      'kafka.orderCreatedTopic',
      'order.created',
    );
  }

  onModuleInit(): void {
    void this.connectWithRetry();
  }

  private async handleOrderCreated({
    message,
  }: EachMessagePayload): Promise<void> {
    if (!message.value) {
      return;
    }

    const event = JSON.parse(message.value.toString()) as OrderCreatedEvent;
    this.logger.log(`Processing order.created event for order ${event.orderId}`);

    await this.updateOrderStatus(event.orderId, OrderStatus.PROCESSING);
    await this.sleep(1500);
    await this.updateOrderStatus(event.orderId, OrderStatus.APPROVED);
  }

  private async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<void> {
    await this.prisma.order.update({
      where: {
        id: orderId,
      },
      data: {
        status,
      },
    });

    await this.redisService.del(`orders:${orderId}`);
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  private async connectWithRetry(): Promise<void> {
    let attempt = 1;

    while (!this.connected) {
      try {
        await this.consumer.connect();
        await this.consumer.subscribe({
          topic: this.orderCreatedTopic,
          fromBeginning: false,
        });
        await this.consumer.run({
          eachMessage: (payload) => this.handleOrderCreated(payload),
        });

        this.connected = true;
        this.logger.log('Kafka consumer connected');
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Kafka consumer connection failed on attempt ${attempt}: ${message}`,
        );
        attempt += 1;
        await this.sleep(3000);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.consumer.disconnect();
    }
  }
}
