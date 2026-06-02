import { Module } from '@nestjs/common';
import { KafkaConsumerService } from './kafka.consumer.service';
import { KafkaProducerService } from './kafka.producer.service';

@Module({
  providers: [KafkaProducerService, KafkaConsumerService],
  exports: [KafkaProducerService],
})
export class KafkaModule {}
