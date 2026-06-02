const fs = require('node:fs');
const path = require('node:path');
const PDFDocument = require('pdfkit');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'docs');
const outputPath = path.join(
  outputDir,
  'relatorio-tecnico-ordering-system.pdf',
);

fs.mkdirSync(outputDir, { recursive: true });

const pkg = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'),
);

const doc = new PDFDocument({
  size: 'LETTER',
  margins: {
    top: 72,
    right: 72,
    bottom: 72,
    left: 72,
  },
  bufferPages: true,
  info: {
    Title: 'Relatorio Tecnico - Ordering System API',
    Author: 'Ordering System',
    Subject: 'Documentacao tecnica do projeto NestJS GraphQL',
    Keywords: 'NestJS, GraphQL, Prisma, PostgreSQL, Redis, Kafka, Docker',
  },
});

const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

const colors = {
  title: '#0B2545',
  heading: '#2E74B5',
  headingDark: '#1F4D78',
  body: '#1F2937',
  muted: '#667085',
  border: '#D0D5DD',
  fill: '#F2F4F7',
  callout: '#E8EEF5',
  codeBg: '#F8FAFC',
};

const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

function ensureSpace(height) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function addText(text, options = {}) {
  const {
    size = 10.5,
    color = colors.body,
    font = 'Helvetica',
    lineGap = 3,
    align = 'left',
    width = contentWidth,
    after = 8,
    before = 0,
  } = options;

  ensureSpace(size * 2 + before + after);
  if (before) doc.moveDown(before / 12);
  doc
    .font(font)
    .fontSize(size)
    .fillColor(color)
    .text(text, {
      width,
      align,
      lineGap,
    });
  if (after) doc.moveDown(after / 12);
}

function title(text) {
  doc
    .font('Helvetica-Bold')
    .fontSize(28)
    .fillColor(colors.title)
    .text(text, {
      width: contentWidth,
      lineGap: 4,
    });
  doc.moveDown(0.4);
}

function subtitle(text) {
  doc
    .font('Helvetica')
    .fontSize(13)
    .fillColor(colors.muted)
    .text(text, {
      width: contentWidth,
      lineGap: 4,
    });
  doc.moveDown(1.2);
}

function h1(text) {
  ensureSpace(48);
  doc.moveDown(0.8);
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor(colors.heading)
    .text(text, { width: contentWidth });
  doc.moveDown(0.35);
}

function h2(text) {
  ensureSpace(36);
  doc.moveDown(0.45);
  doc
    .font('Helvetica-Bold')
    .fontSize(13)
    .fillColor(colors.heading)
    .text(text, { width: contentWidth });
  doc.moveDown(0.25);
}

function h3(text) {
  ensureSpace(30);
  doc.moveDown(0.25);
  doc
    .font('Helvetica-Bold')
    .fontSize(11.5)
    .fillColor(colors.headingDark)
    .text(text, { width: contentWidth });
  doc.moveDown(0.15);
}

function paragraph(text) {
  addText(text);
}

function bullet(text) {
  ensureSpace(32);
  const x = doc.x;
  const y = doc.y;
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(colors.body)
    .text('•', x, y, { continued: false });
  doc
    .font('Helvetica')
    .fontSize(10.5)
    .fillColor(colors.body)
    .text(text, x + 18, y, {
      width: contentWidth - 18,
      lineGap: 3,
    });
  doc.moveDown(0.35);
}

function numbered(items) {
  items.forEach((item, index) => {
    ensureSpace(36);
    const x = doc.x;
    const y = doc.y;
    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(colors.headingDark)
      .text(`${index + 1}.`, x, y);
    doc
      .font('Helvetica')
      .fontSize(10.5)
      .fillColor(colors.body)
      .text(item, x + 24, y, {
        width: contentWidth - 24,
        lineGap: 3,
      });
    doc.moveDown(0.35);
  });
}

function codeBlock(text) {
  const lines = text.trim().split('\n');
  const height = Math.max(36, lines.length * 13 + 18);
  ensureSpace(height + 12);
  const x = doc.x;
  const y = doc.y;
  doc
    .roundedRect(x, y, contentWidth, height, 4)
    .fillAndStroke(colors.codeBg, colors.border);
  doc
    .font('Courier')
    .fontSize(8.5)
    .fillColor('#344054')
    .text(text.trim(), x + 10, y + 9, {
      width: contentWidth - 20,
      lineGap: 2,
    });
  doc.y = y + height + 10;
}

function callout(label, text) {
  const height = doc.heightOfString(text, {
    width: contentWidth - 24,
    lineGap: 3,
  }) + 42;
  ensureSpace(height + 10);
  const x = doc.x;
  const y = doc.y;
  doc
    .roundedRect(x, y, contentWidth, height, 5)
    .fillAndStroke(colors.callout, '#C7D7EA');
  doc
    .font('Helvetica-Bold')
    .fontSize(10.5)
    .fillColor(colors.headingDark)
    .text(label, x + 12, y + 10, { width: contentWidth - 24 });
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor(colors.body)
    .text(text, x + 12, y + 27, {
      width: contentWidth - 24,
      lineGap: 3,
    });
  doc.y = y + height + 12;
}

function table(headers, rows, widths) {
  const rowPad = 7;
  const headerHeight = 26;
  const normalizedWidths =
    widths || headers.map(() => contentWidth / headers.length);

  function rowHeight(row) {
    return Math.max(
      26,
      ...row.map((cell, index) =>
        doc.heightOfString(String(cell), {
          width: normalizedWidths[index] - rowPad * 2,
          lineGap: 2,
        }) + rowPad * 2,
      ),
    );
  }

  ensureSpace(headerHeight + 40);
  let x = doc.x;
  let y = doc.y;

  doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.headingDark);
  headers.forEach((header, index) => {
    const width = normalizedWidths[index];
    doc.rect(x, y, width, headerHeight).fillAndStroke(colors.fill, colors.border);
    doc.fillColor(colors.headingDark).text(header, x + rowPad, y + 8, {
      width: width - rowPad * 2,
      lineGap: 1,
    });
    x += width;
  });
  y += headerHeight;

  rows.forEach((row) => {
    const height = rowHeight(row);
    if (y + height > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.y;
      x = doc.x;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(colors.headingDark);
      headers.forEach((header, index) => {
        const width = normalizedWidths[index];
        doc.rect(x, y, width, headerHeight).fillAndStroke(colors.fill, colors.border);
        doc.fillColor(colors.headingDark).text(header, x + rowPad, y + 8, {
          width: width - rowPad * 2,
          lineGap: 1,
        });
        x += width;
      });
      y += headerHeight;
    }

    x = doc.page.margins.left;
    doc.font('Helvetica').fontSize(8.8).fillColor(colors.body);
    row.forEach((cell, index) => {
      const width = normalizedWidths[index];
      doc.rect(x, y, width, height).stroke(colors.border);
      doc.fillColor(colors.body).text(String(cell), x + rowPad, y + rowPad, {
        width: width - rowPad * 2,
        lineGap: 2,
      });
      x += width;
    });
    y += height;
  });

  doc.y = y + 12;
}

function sectionDivider(text) {
  doc.addPage();
  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor(colors.title)
    .text(text, {
      width: contentWidth,
      align: 'center',
    });
  doc.moveDown(1);
}

function addFooter() {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const pageNumber = i + 1;
    const footerY = doc.page.height - 42;
    doc
      .moveTo(doc.page.margins.left, footerY - 10)
      .lineTo(doc.page.width - doc.page.margins.right, footerY - 10)
      .strokeColor('#E4E7EC')
      .lineWidth(0.5)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(colors.muted)
      .text('Ordering System API - Relatorio tecnico', doc.page.margins.left, footerY, {
        width: contentWidth / 2,
      });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(colors.muted)
      .text(`Pagina ${pageNumber} de ${range.count}`, doc.page.margins.left, footerY, {
        width: contentWidth,
        align: 'right',
      });
  }
}

function addTechnologySection() {
  h1('1. Visao Geral Do Projeto');
  paragraph(
    'O Ordering System API e um backend profissional para gerenciamento de pedidos, construido em Node.js com NestJS e GraphQL. O projeto foi desenhado para portfolio, mas usa decisoes reais de arquitetura: separacao por modulos, services com regra de negocio, resolvers finos, Prisma como camada de persistencia, Redis para cache e Kafka para processamento assincrono.',
  );
  paragraph(
    'A API permite criar usuarios, cadastrar produtos, criar pedidos, listar pedidos, buscar pedido por ID e atualizar status. Ao criar um pedido, o sistema salva os dados no PostgreSQL, invalida cache no Redis, publica um evento no Kafka e um consumer processa esse evento para simular a evolucao assincrona do pedido.',
  );
  callout(
    'Objetivo tecnico',
    'Demonstrar uma arquitetura backend moderna com GraphQL, persistencia relacional, cache distribuido, mensageria, containers, validacao de entrada e configuracao por variaveis de ambiente.',
  );

  h2('Stack implementada');
  table(
    ['Tecnologia', 'Papel no projeto'],
    [
      ['NestJS', 'Framework principal da API. Organiza modulos, injecao de dependencia, bootstrap, providers e ciclo de vida da aplicacao.'],
      ['GraphQL', 'Camada de contrato da API. Expõe queries e mutations como createUser, findProducts, createOrder e updateOrderStatus.'],
      ['PostgreSQL', 'Banco relacional responsavel por armazenar usuarios, produtos, pedidos e itens de pedido.'],
      ['Prisma ORM', 'Mapeia o schema relacional para TypeScript e fornece queries tipadas, migrations e transacoes.'],
      ['Redis', 'Cache de leituras frequentes, principalmente listagem de produtos e busca de pedido por ID.'],
      ['Apache Kafka', 'Mensageria para desacoplar a criacao do pedido do processamento assincrono.'],
      ['Docker Compose', 'Orquestra app, postgres, redis, kafka e zookeeper em ambiente local reproduzivel.'],
      ['class-validator', 'Valida inputs GraphQL antes de executar a regra de negocio.'],
      ['@nestjs/config + Joi', 'Carrega e valida variaveis de ambiente obrigatorias.'],
      ['TypeScript', 'Tipagem estatica, modelos GraphQL, DTOs e maior seguranca de refatoracao.'],
    ],
    [110, contentWidth - 110],
  );
}

function addArchitectureSection() {
  h1('2. Arquitetura E Estrutura De Pastas');
  paragraph(
    'A arquitetura segue uma abordagem modular. Cada area de negocio possui seu proprio modulo, resolver, service, DTOs de entrada e models de saida. Integracoes de infraestrutura tambem ficam isoladas em modulos dedicados, como Redis, Kafka e Prisma.',
  );

  codeBlock(`
src/
  main.ts
  app.module.ts
  config/
  prisma/
  common/
    exceptions/
    filters/
    interceptors/
  modules/
    users/
    products/
    orders/
    redis/
    kafka/
prisma/
  schema.prisma
  migrations/
docker-compose.yml
Dockerfile
.env
.env.example
README.md
`);

  h2('Fluxo entre camadas');
  numbered([
    'O cliente envia uma query ou mutation para /graphql.',
    'O resolver GraphQL recebe os argumentos e chama um service.',
    'O service executa regra de negocio, validacoes de existencia e operacoes de banco.',
    'O PrismaService executa queries no PostgreSQL.',
    'O RedisService armazena ou invalida cache quando necessario.',
    'O KafkaProducerService publica eventos de dominio.',
    'O KafkaConsumerService processa eventos de forma assincrona.',
  ]);

  h2('Principios usados');
  bullet('Resolvers nao contem regra de negocio; eles apenas adaptam GraphQL para services.');
  bullet('Services concentram regras como calculo de total, validacao de estoque e atualizacao de status.');
  bullet('DTOs/InputTypes representam entrada e usam class-validator.');
  bullet('Models/ObjectTypes representam retorno GraphQL.');
  bullet('Infraestrutura externa fica encapsulada para reduzir acoplamento.');
}

function addDataModelSection() {
  h1('3. Modelo De Dados Com Prisma E PostgreSQL');
  paragraph(
    'O arquivo prisma/schema.prisma define o contrato entre a aplicacao e o banco. Ele cria quatro entidades principais: User, Product, Order e OrderItem, alem do enum OrderStatus. O PostgreSQL e usado por ser relacional, consistente e adequado para pedidos, itens e integridade referencial.',
  );

  table(
    ['Entidade', 'Campos principais', 'Responsabilidade'],
    [
      ['User', 'id, name, email, createdAt, updatedAt', 'Representa a pessoa que realiza pedidos. O email e unico.'],
      ['Product', 'id, name, description, price, stock, createdAt, updatedAt', 'Representa produtos disponiveis para compra. Price usa Decimal no banco para evitar erro de ponto flutuante.'],
      ['Order', 'id, userId, status, total, createdAt, updatedAt', 'Representa o pedido. Possui usuario, status e total consolidado.'],
      ['OrderItem', 'id, orderId, productId, quantity, price', 'Representa os itens do pedido. Guarda o preco historico do produto no momento da compra.'],
    ],
    [85, 165, contentWidth - 250],
  );

  h2('Relacionamentos');
  bullet('User possui muitos Orders.');
  bullet('Order pertence a um User.');
  bullet('Order possui muitos OrderItems.');
  bullet('OrderItem pertence a um Order e a um Product.');
  bullet('Product pode aparecer em muitos OrderItems.');

  h2('Status do pedido');
  table(
    ['Status', 'Significado'],
    [
      ['PENDING', 'Pedido criado e aguardando processamento.'],
      ['PROCESSING', 'Consumer Kafka iniciou processamento assincrono.'],
      ['APPROVED', 'Pedido processado e aprovado.'],
      ['CANCELED', 'Pedido cancelado manualmente por mutation.'],
    ],
    [120, contentWidth - 120],
  );

  h2('Migration inicial');
  paragraph(
    'A migration prisma/migrations/20260601203800_init/migration.sql cria o enum OrderStatus, as tabelas, indices e foreign keys. Isso permite que o ambiente Docker aplique o schema automaticamente com prisma migrate deploy ao iniciar o container app.',
  );
}

function addCodeSection() {
  h1('4. O Que Cada Parte Do Codigo Faz');

  h2('src/main.ts');
  paragraph(
    'E o ponto de entrada da aplicacao. Cria a instancia Nest, registra ValidationPipe global, filtro GraphQL de excecoes, interceptor de logging, habilita CORS e inicia o servidor na porta configurada.',
  );
  bullet('ValidationPipe com whitelist remove propriedades desconhecidas.');
  bullet('forbidNonWhitelisted rejeita campos nao declarados nos DTOs.');
  bullet('transform permite converter entradas para tipos esperados.');

  h2('src/app.module.ts');
  paragraph(
    'E o modulo raiz. Carrega ConfigModule global, configura GraphQL com ApolloDriver e autoSchemaFile, registra PrismaModule, RedisModule, UsersModule, ProductsModule e OrdersModule. Como o KafkaModule e usado dentro de OrdersModule, ele fica ligado ao fluxo de pedidos.',
  );

  h2('src/config');
  paragraph(
    'configuration.ts organiza variaveis de ambiente em grupos logicos: app, database, redis e kafka. env.validation.ts usa Joi para garantir que variaveis obrigatorias existam e tenham formato correto antes da aplicacao iniciar.',
  );

  h2('src/prisma');
  paragraph(
    'PrismaModule e global e exporta PrismaService. PrismaService estende PrismaClient e implementa onModuleInit/onModuleDestroy para abrir e fechar conexao com o PostgreSQL no ciclo de vida do Nest.',
  );

  h2('src/modules/users');
  table(
    ['Arquivo', 'Funcao'],
    [
      ['create-user.input.ts', 'Define name e email de entrada. Usa IsString, IsNotEmpty, MaxLength e IsEmail.'],
      ['user.model.ts', 'Define o tipo GraphQL de saida UserModel.'],
      ['users.resolver.ts', 'Expoe createUser e findUsers no schema GraphQL.'],
      ['users.service.ts', 'Cria usuarios, lista usuarios e trata conflito de email unico com Prisma P2002.'],
      ['users.module.ts', 'Agrupa resolver e service e exporta UsersService.'],
    ],
    [150, contentWidth - 150],
  );

  h2('src/modules/products');
  table(
    ['Arquivo', 'Funcao'],
    [
      ['create-product.input.ts', 'Define name, description, price e stock com validacoes.'],
      ['product.model.ts', 'Define ProductModel para GraphQL, incluindo price como Float e stock como Int.'],
      ['products.resolver.ts', 'Expoe createProduct e findProducts.'],
      ['products.service.ts', 'Cria produtos, converte price para Prisma.Decimal, lista produtos e aplica cache Redis em products:list.'],
      ['products.module.ts', 'Agrupa resolver/service e importa RedisModule.'],
    ],
    [150, contentWidth - 150],
  );

  h2('src/modules/orders');
  table(
    ['Arquivo', 'Funcao'],
    [
      ['create-order.input.ts', 'Recebe userId e uma lista de itens. Usa ArrayNotEmpty e ValidateNested.'],
      ['order-item.input.ts', 'Recebe productId e quantity, garantindo quantidade minima 1.'],
      ['update-order-status.input.ts', 'Recebe orderId e status validado contra OrderStatus.'],
      ['order-status.enum.ts', 'Define enum local usado por GraphQL e class-validator. Evita dependencia de enum runtime do Prisma.'],
      ['order.model.ts', 'Define retorno GraphQL do pedido, incluindo user e items.'],
      ['order-item.model.ts', 'Define retorno GraphQL dos itens do pedido e produto opcional.'],
      ['orders.resolver.ts', 'Expoe createOrder, findOrders, findOrderById e updateOrderStatus.'],
      ['orders.service.ts', 'Implementa regra de negocio: valida usuario/produtos, calcula total, cria pedido em transacao, decrementa estoque, invalida cache e publica evento Kafka.'],
    ],
    [150, contentWidth - 150],
  );

  h2('src/modules/redis');
  paragraph(
    'RedisService encapsula ioredis. Ele fornece get, set, del e delByPattern. Isso evita que outros services conhecam detalhes do cliente Redis e padroniza TTL e serializacao JSON.',
  );

  h2('src/modules/kafka');
  paragraph(
    'KafkaProducerService cria o producer e publica order.created. KafkaConsumerService cria o consumer, assina o topico order.created e atualiza o pedido para PROCESSING e depois APPROVED. Ambos usam conexao resiliente para evitar que o app caia se o Kafka demorar a ficar pronto.',
  );

  h2('src/common');
  bullet('GraphqlExceptionFilter permite que HttpException seja retornada de forma compativel com GraphQL.');
  bullet('LoggingInterceptor mede tempo de execucao de handlers e ajuda a observar chamadas.');
  bullet('AppException e uma excecao base simples para padronizar erros customizados.');
}

function addOrderFlowSection() {
  h1('5. Fluxo Detalhado De Criacao De Pedido');
  paragraph(
    'A criacao de pedido e o principal caso de uso do sistema. Ela combina GraphQL, validacao, transacao SQL, Redis e Kafka.',
  );
  numbered([
    'Cliente chama createOrder com userId e items.',
    'CreateOrderInput valida formato, lista nao vazia e itens aninhados.',
    'OrdersResolver delega para OrdersService.create.',
    'O service agrupa itens duplicados do mesmo produto para evitar inconsistencias de estoque.',
    'Uma transacao Prisma valida usuario, busca produtos e confere estoque.',
    'O total e calculado somando product.price * quantity para cada item.',
    'O Order e criado com status PENDING e os OrderItems sao criados no mesmo comando.',
    'O estoque e decrementado com updateMany e condicao stock >= quantity.',
    'O cache orders:* e invalidado para evitar leituras antigas.',
    'KafkaProducerService publica order.created.',
    'KafkaConsumerService consome o evento, muda status para PROCESSING, aguarda simulacao e muda para APPROVED.',
    'A cada atualizacao assincrona, o cache orders:{id} e invalidado.',
  ]);

  h2('Por que usar transacao?');
  paragraph(
    'A transacao garante que a criacao do pedido, itens e atualizacao de estoque acontecam como uma unidade logica. Se alguma parte falhar, tudo e revertido. Isso evita pedido criado sem item, estoque decrementado sem pedido ou total incoerente.',
  );

  h2('Por que salvar preco no OrderItem?');
  paragraph(
    'O preco do produto pode mudar depois. Guardar price dentro de OrderItem preserva o valor historico pago naquele pedido, uma pratica importante em sistemas de venda reais.',
  );
}

function addCacheAndKafkaSection() {
  h1('6. Redis E Kafka');

  h2('Cache com Redis');
  paragraph(
    'Redis e usado para reduzir consultas repetidas ao banco em leituras frequentes. O projeto aplica cache em findProducts e findOrderById.',
  );
  table(
    ['Operacao', 'Chave', 'Quando invalida'],
    [
      ['findProducts', 'products:list', 'Quando createProduct cria um novo produto.'],
      ['findOrderById', 'orders:{id}', 'Quando pedido e criado, status e atualizado ou consumer processa evento.'],
    ],
    [120, 120, contentWidth - 240],
  );
  paragraph(
    'A invalidacao e explicita. Isso evita retornar produtos desatualizados ou status antigo de pedido depois de alteracoes.',
  );

  h2('Mensageria com Kafka');
  paragraph(
    'Kafka representa uma fila/event stream entre a criacao do pedido e seu processamento. A API nao precisa processar tudo sincronamente. Ela salva o pedido e publica order.created; o consumer cuida da etapa assincrona.',
  );
  table(
    ['Componente', 'Responsabilidade'],
    [
      ['KafkaProducerService', 'Conectar ao Kafka e publicar order.created com orderId, userId, total e createdAt.'],
      ['KafkaConsumerService', 'Assinar order.created, simular processamento e atualizar status no banco.'],
      ['OrderCreatedEvent', 'Contrato do payload publicado no topico.'],
      ['Zookeeper', 'Coordena o broker Kafka na imagem usada pelo docker-compose.'],
    ],
    [145, contentWidth - 145],
  );
}

function addDockerSection() {
  h1('7. Docker, Ambiente E Execucao');
  paragraph(
    'O Dockerfile usa multi-stage build. Primeiro instala dependencias, depois gera Prisma Client e compila NestJS, e no estagio final copia dist, prisma e node_modules. O Prisma Client tambem e gerado no estagio final para garantir que o runtime tenha o client inicializado.',
  );

  h2('Servicos do docker-compose');
  table(
    ['Servico', 'Imagem/Build', 'Porta', 'Funcao'],
    [
      ['app', 'Dockerfile local', '3000', 'API NestJS GraphQL.'],
      ['postgres', 'postgres:16-alpine', '5432', 'Banco relacional.'],
      ['redis', 'redis:7-alpine', '6379', 'Cache.'],
      ['zookeeper', 'confluentinc/cp-zookeeper:7.7.0', '2181', 'Coordenacao do Kafka.'],
      ['kafka', 'confluentinc/cp-kafka:7.7.0', '9092/29092', 'Broker de eventos.'],
    ],
    [85, 145, 70, contentWidth - 300],
  );

  h2('Healthchecks e prontidao');
  paragraph(
    'PostgreSQL possui healthcheck com pg_isready. Kafka possui healthcheck com kafka-broker-api-versions. O app depende de postgres healthy e kafka healthy para reduzir falhas de boot.',
  );

  h2('Comandos principais');
  codeBlock(`
npm install
npm run prisma:generate
npm run build
npm run lint
npm run docs:pdf
docker compose up --build
docker compose down
`);
}

function addGraphqlSection() {
  h1('8. API GraphQL');
  paragraph(
    'O projeto usa GraphQL code-first. Os decorators @ObjectType, @InputType, @Field, @Query e @Mutation geram o schema GraphQL a partir do TypeScript.',
  );

  h2('Operacoes disponiveis');
  table(
    ['Operacao', 'Tipo', 'Descricao'],
    [
      ['createUser', 'Mutation', 'Cria usuario com name e email.'],
      ['findUsers', 'Query', 'Lista usuarios cadastrados.'],
      ['createProduct', 'Mutation', 'Cria produto com preco e estoque.'],
      ['findProducts', 'Query', 'Lista produtos usando cache Redis.'],
      ['createOrder', 'Mutation', 'Cria pedido, calcula total, decrementa estoque e publica evento.'],
      ['findOrders', 'Query', 'Lista pedidos com usuario, itens e produtos.'],
      ['findOrderById', 'Query', 'Busca pedido por ID usando cache Redis.'],
      ['updateOrderStatus', 'Mutation', 'Atualiza manualmente o status do pedido.'],
    ],
    [125, 70, contentWidth - 195],
  );

  h2('Exemplo: criar usuario');
  codeBlock(`
mutation CreateUser {
  createUser(input: {
    name: "Ana Silva"
    email: "ana@example.com"
  }) {
    id
    name
    email
  }
}
`);

  h2('Exemplo: criar produto');
  codeBlock(`
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
`);

  h2('Exemplo: criar pedido');
  codeBlock(`
mutation CreateOrder {
  createOrder(input: {
    userId: "USER_ID"
    items: [
      { productId: "PRODUCT_ID", quantity: 2 }
    ]
  }) {
    id
    status
    total
    items {
      quantity
      price
      product { name }
    }
  }
}
`);
}

function addOperationalSection() {
  h1('9. Boas Praticas Aplicadas');
  bullet('Arquitetura modular por dominio e infraestrutura.');
  bullet('Separacao entre entrada GraphQL, saida GraphQL e regra de negocio.');
  bullet('Uso de transacao para operacoes criticas de pedido e estoque.');
  bullet('Uso de Decimal no Prisma para valores monetarios.');
  bullet('Cache com invalidacao explicita.');
  bullet('Mensageria para desacoplar processamento do pedido.');
  bullet('Docker Compose reproduzivel para stack completa.');
  bullet('Configuracao por variaveis de ambiente com validacao.');
  bullet('Build, lint e Prisma validate executados durante o desenvolvimento.');

  h2('Decisoes tomadas durante a estabilizacao');
  table(
    ['Problema encontrado', 'Ajuste aplicado'],
    [
      ['PowerShell bloqueava npm.ps1', 'Uso de npm.cmd nos comandos Windows.'],
      ['Prisma validate sem DATABASE_URL', 'Criacao de .env local e Compose com hosts internos fixos.'],
      ['Prisma Client nao inicializado no container', 'Dockerfile passou a executar npx prisma generate tambem no estagio final.'],
      ['Kafka ainda nao pronto no boot', 'Healthcheck no Kafka e conexao resiliente em producer/consumer.'],
      ['Enum Prisma indefinido em runtime para class-validator', 'Enum OrderStatus local para GraphQL e validacao.'],
      ['GraphQL nao inferia description nullable', 'Tipo GraphQL explicito e normalizacao de null para undefined.'],
      ['Apollo/Nest exigia integracao Express 5', 'Adicao de @as-integrations/express5.'],
    ],
    [170, contentWidth - 170],
  );
}

function addFutureSection() {
  h1('10. Proximos Passos Recomendados');
  paragraph(
    'O projeto ja demonstra uma base profissional, mas pode evoluir para um sistema ainda mais completo e proximo de producao.',
  );
  bullet('Adicionar autenticacao JWT e autorizacao por roles.');
  bullet('Criar testes unitarios para services e testes e2e para GraphQL.');
  bullet('Adicionar paginacao e filtros nas listagens.');
  bullet('Implementar updateProduct e regras de reposicao de estoque.');
  bullet('Adicionar observabilidade com logs estruturados, metrics e tracing.');
  bullet('Criar DLQ ou topico de erro para falhas no consumer Kafka.');
  bullet('Adicionar CI com lint, build, testes e prisma validate.');
  bullet('Criar seed de dados para demonstracao do portfolio.');
  bullet('Adicionar tratamento de idempotencia para eventos Kafka.');

  h2('Resumo executivo');
  callout(
    'Resultado',
    `O projeto ${pkg.name} entrega uma API GraphQL modular com persistencia relacional, cache, mensageria e containerizacao. Ele e adequado para portfolio porque mostra dominio de arquitetura backend moderna, integracoes reais e preocupacao com operacao local reproduzivel.`,
  );
}

// Cover
title('Ordering System API');
subtitle('Relatorio tecnico detalhado do projeto NestJS, GraphQL, PostgreSQL, Redis, Kafka, Prisma e Docker');
addText(`Versao do projeto: ${pkg.version}`, {
  size: 10,
  color: colors.muted,
  after: 3,
});
addText(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, {
  size: 10,
  color: colors.muted,
  after: 16,
});
callout(
  'Escopo do documento',
  'Este PDF explica o objetivo do projeto, a stack, a arquitetura, o modelo de dados, os fluxos principais, o papel de cada tecnologia e o que cada modulo/codigo implementado faz.',
);

h2('Indice');
[
  '1. Visao Geral Do Projeto',
  '2. Arquitetura E Estrutura De Pastas',
  '3. Modelo De Dados Com Prisma E PostgreSQL',
  '4. O Que Cada Parte Do Codigo Faz',
  '5. Fluxo Detalhado De Criacao De Pedido',
  '6. Redis E Kafka',
  '7. Docker, Ambiente E Execucao',
  '8. API GraphQL',
  '9. Boas Praticas Aplicadas',
  '10. Proximos Passos Recomendados',
].forEach((item) => bullet(item));

sectionDivider('Documentacao Tecnica');
addTechnologySection();
addArchitectureSection();
addDataModelSection();
addCodeSection();
addOrderFlowSection();
addCacheAndKafkaSection();
addDockerSection();
addGraphqlSection();
addOperationalSection();
addFutureSection();

addFooter();
doc.end();

stream.on('finish', () => {
  const stats = fs.statSync(outputPath);
  console.log(`PDF generated: ${outputPath}`);
  console.log(`Size: ${stats.size} bytes`);
});
