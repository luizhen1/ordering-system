import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private readonly producer: Producer;
  private readonly orderCreatedTopic: string;
  private connected = false;
  private connecting?: Promise<void>;

  constructor(private readonly configService: ConfigService) {
    const kafka = new Kafka({
      clientId: this.configService.get<string>('kafka.clientId', 'ordering-system'),
      brokers: this.configService.get<string[]>('kafka.brokers', ['localhost:29092']),
    });

    this.producer = kafka.producer();
    this.orderCreatedTopic = this.configService.get<string>(
      'kafka.orderCreatedTopic',
      'order.created',
    );
  }

  onModuleInit(): void {
    void this.connectWithRetry();
  }

  async publishOrderCreated<T extends { orderId: string }>(
    payload: T,
  ): Promise<void> {
    await this.ensureConnected();

    await this.producer.send({
      topic: this.orderCreatedTopic,
      messages: [
        {
          key: payload.orderId,
          value: JSON.stringify(payload),
        },
      ],
    });
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected) {
      return;
    }

    if (!this.connecting) {
      this.connecting = this.connectWithRetry(5);
    }

    await this.connecting;
  }

  private async connectWithRetry(maxAttempts?: number): Promise<void> {
    let attempt = 1;

    while (!this.connected) {
      try {
        await this.producer.connect();
        this.connected = true;
        this.logger.log('Kafka producer connected');
        return;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Kafka producer connection failed on attempt ${attempt}: ${message}`,
        );

        if (maxAttempts && attempt >= maxAttempts) {
          this.connecting = undefined;
          throw error;
        }

        attempt += 1;
        await this.sleep(3000);
      }
    }
  }

  private sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connected) {
      await this.producer.disconnect();
    }
  }
}
