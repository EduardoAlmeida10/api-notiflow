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

- Node.js e npm
- PostgreSQL
- Git

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
