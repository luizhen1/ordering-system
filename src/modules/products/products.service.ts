import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateProductInput } from './dto/create-product.input';
import { ProductModel } from './models/product.model';

const PRODUCTS_LIST_CACHE_KEY = 'products:list';

type ProductRecord = {
  id: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  stock: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async create(input: CreateProductInput): Promise<ProductModel> {
    const product = await this.prisma.product.create({
      data: {
        ...input,
        price: new Prisma.Decimal(input.price),
      },
    });

    await this.redisService.del(PRODUCTS_LIST_CACHE_KEY);

    return this.toModel(product);
  }

  async findAll(): Promise<ProductModel[]> {
    const cached = await this.redisService.get<ProductModel[]>(
      PRODUCTS_LIST_CACHE_KEY,
    );

    if (cached) {
      return cached.map((product) => this.restoreProductDates(product));
    }

    const products = await this.prisma.product.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result = products.map((product) => this.toModel(product));
    await this.redisService.set(PRODUCTS_LIST_CACHE_KEY, result);

    return result;
  }

  private toModel(product: ProductRecord): ProductModel {
    return {
      ...product,
      description: product.description ?? undefined,
      price: Number(product.price),
    };
  }

  private restoreProductDates(product: ProductModel): ProductModel {
    return {
      ...product,
      createdAt: new Date(product.createdAt),
      updatedAt: new Date(product.updatedAt),
    };
  }
}
