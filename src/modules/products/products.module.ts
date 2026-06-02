import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { ProductsResolver } from './products.resolver';
import { ProductsService } from './products.service';

@Module({
  imports: [RedisModule],
  providers: [ProductsResolver, ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
