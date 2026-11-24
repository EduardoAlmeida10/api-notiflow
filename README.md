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

O projeto utiliza **arquitetura hexagonal (Ports and Adapters)**, separando domínio, casos de uso e infraestrutura. A API é desenvolvida em **NestJS**, com **PostgreSQL e Prisma** para persistência. O processamento assíncrono usa **Redis e BullMQ**, por meio de um worker responsável pelo envio SMTP.

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

> **Estado atual:** a API aceita solicitações de notificações e as coloca na fila. O worker preenche os templates, envia por SMTP e registra as tentativas. Retry, idempotência da solicitação e recuperação confiável ainda estão previstos.

## Pré-requisitos

[![Node.js](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-10%2B-CB3837?logo=npm&logoColor=white)](https://www.npmjs.com/)

Redis e PostgreSQL são necessários para executar a API e o worker.

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

**Solicitar uma notificação — `POST /api/notifications`:** recebe `templateId`, `recipient` e `data`, retornando `202 Accepted` quando a solicitação for aceita para processamento. O retorno não confirma a entrega.

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

O terminal do worker deve exibir a mensagem `Tarefa ... consumida: Olá do Notiflow!`. Para iniciar o worker sem modo de observação, use `npm run start:worker`. Esta fila é apenas uma demonstração; o mesmo worker também processa a fila de notificações.

### Adaptador de fila de notificações (L2)

O adaptador BullMQ publica na fila `notifications` uma tarefa `send-notification`, identificada pelo ID da notificação e contendo `{ notificationId }`. O worker consome essa fila para realizar o envio.

Para testar o adaptador com um Redis de teste ativo, configure `REDIS_HOST` e `REDIS_PORT` e execute:

```bash
npm run test:redis
```

A publicação pode ter resultado incerto se a conexão falhar após o Redis receber a tarefa; idempotência da solicitação e recuperação confiável de publicações continuam previstas para etapas posteriores.

### Preenchimento de templates (L3)

O `TemplateRenderer` preenche assunto e corpo usando variáveis como `{{nome}}` ou `{{ nome }}`. Os nomes podem conter letras, números e `_`; os valores aceitos são texto, números finitos e booleanos. Valores ausentes, nulos ou de outros tipos geram `TemplateVariablesError` com os nomes das variáveis afetadas. Valores vazios, zero e `false` são aceitos.

O preenchimento é uma substituição literal, sem escape de HTML. O worker utiliza essa regra durante o processamento.

### Envio de e-mail por SMTP (L4)

O adaptador `NodemailerEmailSender` envia o assunto e o corpo em texto simples ao destinatário por SMTP. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` e `SMTP_FROM` no `.env`. Se o servidor exigir autenticação, informe também `SMTP_USER` e `SMTP_PASSWORD`. Use `SMTP_SECURE=true` para SMTP com TLS desde a conexão (por exemplo, porta 465); com `false`, o Nodemailer pode negociar STARTTLS quando o servidor oferecer suporte.

Para verificar o adaptador com um servidor SMTP local criado pelo próprio teste:

```bash
npm run test:smtp
```

O adaptador propaga falhas de envio. O worker utiliza o adaptador para enviar notificações; a classificação das falhas e as novas tentativas serão tratadas na L6.


### Processamento de notificações (L5)

Configure `DATABASE_URL`, Redis e as variáveis SMTP antes de iniciar a API e o worker. Cada tarefa pendente é reservada, o template é preenchido e o envio é tentado. O resultado é registrado na tentativa e no status da notificação. Para testar o fluxo completo com PostgreSQL e Redis de teste configurados, execute `npm run test:delivery`; o teste inicia seu próprio servidor SMTP local.

Nesta etapa não há novas tentativas automáticas. Falhas de template são registradas como permanentes; outras falhas recebem classificação provisória de falha temporária, até a L6. Uma interrupção durante o processamento ou uma falha ao registrar o resultado pode deixar a notificação em `PROCESSING`; a recuperação segura e a confirmação de entrega ainda não estão implementadas.
