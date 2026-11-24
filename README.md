# Notiflow API

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-FF4438?style=for-the-badge&logo=redis&logoColor=white)
![BullMQ](https://img.shields.io/badge/BullMQ-EA4C46?style=for-the-badge)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)

## Objetivo

O **Notiflow** é um serviço reutilizável de notificações por e-mail, desenvolvido como trabalho acadêmico de Arquitetura de Software. Seu objetivo é permitir que diferentes sistemas utilizem uma API centralizada para cadastrar modelos de mensagens (*templates*) e solicitar notificações, sem precisar implementar a lógica de envio em cada aplicação.

## Arquitetura

O projeto utiliza **arquitetura hexagonal (Ports and Adapters)**, separando domínio, casos de uso e infraestrutura. A API é desenvolvida em **NestJS**, com **PostgreSQL e Prisma** para persistência. O processamento assíncrono é planejado com **Redis e BullMQ**, por meio de um worker responsável pelo envio SMTP.

```text
Aplicações consumidoras
         |
     API NestJS
         |
   Casos de uso
    /         \
Prisma     NotificationQueue
   |              |
PostgreSQL    Redis/BullMQ → Worker → SMTP
```

> **Estado atual:** autenticação por API Key e cadastro de templates implementados. A solicitação de notificações já foi desenvolvida e testada com fila simulada, mas o endpoint ainda depende da integração real com BullMQ para ser habilitado na aplicação principal.

## Pré-requisitos

[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-10%2B-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/)

Redis será necessário quando a integração real com BullMQ estiver habilitada.

## Como executar

### 1. Clone o projeto

```bash
git clone <URL_DO_REPOSITORIO>
cd <DIRETORIO_DO_PROJETO>
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Crie um arquivo `.env` com as variáveis exigidas pela configuração do projeto, especialmente a conexão com o PostgreSQL (`DATABASE_URL`). Se houver um `.env.example`, utilize-o como referência.

### 4. Prepare o banco de dados

Inicie o PostgreSQL e execute:

```bash
npx prisma generate
npx prisma migrate deploy
```

### 5. Inicie a API

```bash
npm run start:dev
```

Por padrão, a API estará disponível em `http://localhost:3000`, com rotas sob o prefixo `/api`.

## Como utilizar

Os endpoints protegidos exigem uma API Key válida no cabeçalho `X-API-Key`, vinculada a uma aplicação previamente cadastrada no banco.

**Cadastrar um template — `POST /api/templates`:**

```bash
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <SUA_API_KEY>" \
  -d '{"name":"pedido_confirmado","subject":"Pedido confirmado","body":"Olá, {{nome}}!"}'
```

**Solicitar uma notificação — `POST /api/notifications`:** previsto para disponibilização após a integração da fila real. Receberá `templateId`, `recipient` e `data`, retornando `202 Accepted` quando a solicitação for aceita para processamento.

## Testes

```bash
npm run test
npm run test:e2e
```

Os testes de integração utilizam PostgreSQL. Configure um banco exclusivo para testes antes de executá-los.

### Worker e fila de exemplo (L1)

Inicie um Redis acessível localmente e configure `REDIS_HOST` e `REDIS_PORT` no `.env`; os padrões são `localhost` e `6379`. Por exemplo, com Docker instalado:

```bash
docker run --name notiflow-redis -p 6379:6379 -d redis:7
```

Em um terminal, inicie o worker independente da API:

```bash
npm run start:worker:dev
```

Em outro terminal, publique uma tarefa de exemplo:

```bash
npm run queue:example
```

O terminal do worker deve exibir a mensagem `Tarefa ... consumida: Olá do Notiflow!`. Para iniciar o worker sem modo de observação, use `npm run start:worker`. Esta fila é apenas uma demonstração: o processamento de notificações e a integração do endpoint com a fila serão implementados nas próximas tarefas.

### Adaptador de fila de notificações (L2)

O adaptador BullMQ publica na fila `notifications` uma tarefa `send-notification`, identificada pelo ID da notificação e contendo `{ notificationId }`. A rota de notificações permanece desabilitada na aplicação principal até que o processamento de envio esteja disponível.

Para testar o adaptador com um Redis de teste ativo, configure `REDIS_HOST` e `REDIS_PORT` e execute:

```bash
npm run test:redis
```

A publicação pode ter resultado incerto se a conexão falhar após o Redis receber a tarefa; idempotência da solicitação e recuperação confiável de publicações continuam previstas para etapas posteriores.
