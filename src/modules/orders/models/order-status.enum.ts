import { registerEnumType } from '@nestjs/graphql';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  APPROVED = 'APPROVED',
  CANCELED = 'CANCELED',
}

registerEnumType(OrderStatus, {
  name: 'OrderStatus',
  description: 'Available order status values.',
});
