# Ordering System API

Sistema de pedidos backend construido com NestJS, GraphQL, PostgreSQL, Redis, Apache Kafka, Prisma e TypeScript.

O projeto foi estruturado com foco em boas praticas de arquitetura modular, separacao de responsabilidades e um fluxo realista de processamento assincrono de pedidos.

## System Design
<img width="1021" height="931" alt="image" src="https://github.com/user-attachments/assets/c46682eb-ada0-4c99-90b4-60c0a8c34d70" />

## Objetivo

Disponibilizar uma API GraphQL onde seja possivel:

- criar usuarios;
- listar usuarios;
- criar produtos;
- listar produtos com cache em Redis;
- criar pedidos com itens;
- calcular o total do pedido;
- buscar pedidos;
- buscar pedido por ID com cache em Redis;
- atualizar status do pedido;
- publicar evento `order.created` no Kafka;
- consumir o evento e simular processamento assincrono do pedido.

## Stack

- Node.js
- NestJS
- GraphQL code-first
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- Apache Kafka
- Zookeeper
- Docker e Docker Compose
- class-validator
- @nestjs/config com validacao de variaveis de ambiente

## Arquitetura

```txt
src/
  main.ts
  app.module.ts
  config/
    configuration.ts
    env.validation.ts
  prisma/
    prisma.module.ts
    prisma.service.ts
  common/
    exceptions/
    filters/
    interceptors/
  modules/
    users/
      dto/
      models/
      users.module.ts
      users.resolver.ts
      users.service.ts
    products/
      dto/
      models/
      products.module.ts
      products.resolver.ts
      products.service.ts
    orders/
      dto/
      models/
      orders.module.ts
      orders.resolver.ts
      orders.service.ts
    redis/
      redis.module.ts
      redis.service.ts
    kafka/
      events/
      kafka.module.ts
      kafka.producer.service.ts
      kafka.consumer.service.ts
```

### Decisoes tecnicas

- Resolvers recebem dados GraphQL e delegam a regra de negocio para services.
- DTOs/InputTypes validam entrada com `class-validator`.
- Models/ObjectTypes representam a saida GraphQL.
- Prisma centraliza o acesso ao PostgreSQL.
- Redis fica encapsulado em `RedisService`.
- Kafka fica separado em `KafkaProducerService` e `KafkaConsumerService`.
- Criacao de pedido usa transacao Prisma para salvar pedido, itens e decrementar estoque.
- O cache de produtos usa a chave `products:list`.
- O cache de pedido por ID usa a chave `orders:{id}`.

## Fluxo de criacao de pedido

1. O cliente chama a mutation `createOrder`.
2. `OrdersResolver` encaminha o input para `OrdersService`.
3. O service valida usuario, produtos e estoque.
4. O total e calculado com base no preco atual dos produtos.
5. O pedido e os itens sao salvos no PostgreSQL.
6. O estoque dos produtos e decrementado.
7. O cache de pedidos e invalidado no Redis.
8. A API publica o evento `order.created` no Kafka.
9. `KafkaConsumerService` consome o evento.
10. O consumer altera o pedido para `PROCESSING`, aguarda uma simulacao de processamento e altera para `APPROVED`.
11. O cache do pedido e invalidado a cada atualizacao assincrona.

## Rodando com Docker

O projeto foi preparado para subir tudo com um comando:

```bash
docker compose up --build
```

Servicos criados:

- API NestJS: `http://localhost:3000/graphql`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Kafka externo para sua maquina: `localhost:29092`
- Kafka interno para containers: `kafka:9092`

O `docker-compose.yml` ja possui valores padrao para ambiente Docker. O arquivo `.env.example` documenta todas as variaveis disponiveis.

## Rodando em desenvolvimento local

Instale as dependencias:

```bash
npm install
```

O projeto ja inclui um `.env` local para uso do Prisma CLI e da API fora do Docker. Ele usa hosts locais:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ordering_system?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
KAFKA_BROKERS=localhost:29092
```

O `docker-compose.yml` usa hosts internos dos containers, como `postgres`, `redis` e `kafka`, para evitar conflito com o `.env` local.

Gere o Prisma Client:

```bash
npm run prisma:generate
```

Execute as migrations:

```bash
npm run prisma:migrate
```

Inicie em modo desenvolvimento:

```bash
npm run start:dev
```

## Scripts

```bash
npm run build
npm run start
npm run start:dev
npm run start:prod
npm run lint
npm run test
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:studio
npm run docker:up
npm run docker:down
```

## Exemplos GraphQL

### Criar usuario

```graphql
mutation CreateUser {
  createUser(input: {
    name: "Ana Silva"
    email: "ana@example.com"
  }) {
    id
    name
    email
    createdAt
  }
}
```

### Listar usuarios

```graphql
query FindUsers {
  findUsers {
    id
    name
    email
  }
}
```

### Criar produto

```graphql
mutation CreateProduct {
  createProduct(input: {
    name: "Mechanical Keyboard"
    description: "RGB keyboard with blue switches"
    price: 299.90
    stock: 10
  }) {
    id
    name
    price
    stock
  }
}
```

### Listar produtos

```graphql
query FindProducts {
  findProducts {
    id
    name
    description
    price
    stock
  }
}
```

### Criar pedido

Use IDs reais retornados por `createUser` e `createProduct`.

```graphql
mutation CreateOrder {
  createOrder(input: {
    userId: "USER_ID"
    items: [
      {
        productId: "PRODUCT_ID"
        quantity: 2
      }
    ]
  }) {
    id
    status
    total
    items {
      productId
      quantity
      price
      product {
        name
      }
    }
  }
}
```

### Listar pedidos

```graphql
query FindOrders {
  findOrders {
    id
    status
    total
    user {
      name
      email
    }
    items {
      quantity
      price
      product {
        name
      }
    }
  }
}
```

### Buscar pedido por ID

```graphql
query FindOrderById {
  findOrderById(id: "ORDER_ID") {
    id
    status
    total
    createdAt
    updatedAt
  }
}
```

### Atualizar status do pedido

```graphql
mutation UpdateOrderStatus {
  updateOrderStatus(input: {
    orderId: "ORDER_ID"
    status: CANCELED
  }) {
    id
    status
    updatedAt
  }
}
```

## Modelo de dados

Entidades principais:

- `User`: usuario que realiza pedidos.
- `Product`: produto disponivel para compra.
- `Order`: pedido com status e total.
- `OrderItem`: item do pedido com quantidade e preco historico.

Status disponiveis:

- `PENDING`
- `PROCESSING`
- `APPROVED`
- `CANCELED`

## Cache

Produtos:

- leitura: `findProducts`;
- chave: `products:list`;
- invalidacao: ao criar produto.

Pedidos:

- leitura: `findOrderById`;
- chave: `orders:{id}`;
- invalidacao: ao criar pedido, atualizar status manualmente ou processar evento Kafka.

## Kafka

Evento publicado:

```txt
order.created
```

Payload:

```json
{
  "orderId": "ORDER_ID",
  "userId": "USER_ID",
  "total": 599.8,
  "createdAt": "2026-06-01T23:00:00.000Z"
}
```

O consumer escuta `order.created`, simula o processamento assincrono e atualiza o status do pedido.

## Validacoes realizadas

Foram executados:

```bash
npm run prisma:generate
npm run build
npm run lint
npx prisma validate
```

## Melhorias futuras

- Adicionar autenticacao e autorizacao com JWT.
- Criar testes unitarios e testes e2e.
- Adicionar paginacao nas listagens.
- Criar mutations para atualizar produtos e usuarios.
- Implementar reserva de estoque mais avancada.
- Adicionar observabilidade com logs estruturados e tracing.
- Adicionar DLQ para falhas no processamento Kafka.
- Adicionar CI com lint, build e testes.
