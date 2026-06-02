export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    ttlSeconds: Number(process.env.REDIS_TTL_SECONDS ?? 300),
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS ?? 'localhost:29092')
      .split(',')
      .map((broker) => broker.trim())
      .filter(Boolean),
    clientId: process.env.KAFKA_CLIENT_ID ?? 'ordering-system',
    groupId: process.env.KAFKA_GROUP_ID ?? 'ordering-system-consumer',
    orderCreatedTopic: process.env.KAFKA_ORDER_CREATED_TOPIC ?? 'order.created',
  },
});
