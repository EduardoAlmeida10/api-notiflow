import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { TemplateModule } from '../src/composition/template.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('POST /api/templates (integração)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  const applicationIds: string[] = [];

  function generateApiKey(): string {
    return `nf_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey, 'utf8').digest('hex');
  }

  async function createApplication(isActive = true) {
    const apiKey = generateApiKey();

    const application = await prisma.application.create({
      data: {
        name: `Aplicação de teste ${randomUUID()}`,
        apiKeyHash: hashApiKey(apiKey),
        isActive,
      },
    });

    applicationIds.push(application.id);

    return { application, apiKey };
  }

  const validTemplate = {
    name: 'pedido_confirmado',
    subject: 'Pedido {{numero}} confirmado',
    body: 'Olá, {{nome}}! Seu pedido foi confirmado.',
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), TemplateModule],
    }).compile();

    app = moduleRef.createNestApplication();

    // Mesma configuração de prefixo do main.ts.
    app.setGlobalPrefix('api');

    prisma = moduleRef.get(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    try {
      if (prisma && applicationIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.deliveryAttempt.deleteMany({
            where: {
              notification: {
                applicationId: { in: applicationIds },
              },
            },
          });

          await tx.notification.deleteMany({
            where: {
              applicationId: { in: applicationIds },
            },
          });

          await tx.template.deleteMany({
            where: {
              applicationId: { in: applicationIds },
            },
          });

          await tx.application.deleteMany({
            where: {
              id: { in: applicationIds },
            },
          });
        });
      }
    } finally {
      if (app) {
        await app.close();
      } else {
        await moduleRef?.close();
      }
    }
  });

  it('cadastra um template com API Key válida', async () => {
    const { application, apiKey } = await createApplication();

    const response = await request(app.getHttpServer())
      .post('/api/templates')
      .set('X-API-Key', apiKey)
      .send(validTemplate)
      .expect(201);

    expect(response.body).toMatchObject(validTemplate);
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.createdAt).toEqual(expect.any(String));

    const persisted = await prisma.template.findUnique({
      where: { id: response.body.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.applicationId).toBe(application.id);
  });

  it('rejeita cadastro sem API Key', async () => {
    await request(app.getHttpServer())
      .post('/api/templates')
      .send(validTemplate)
      .expect(401);
  });

  it('rejeita template duplicado na mesma aplicação', async () => {
    const { application, apiKey } = await createApplication();

    await request(app.getHttpServer())
      .post('/api/templates')
      .set('X-API-Key', apiKey)
      .send(validTemplate)
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/templates')
      .set('X-API-Key', apiKey)
      .send(validTemplate)
      .expect(409);

    const count = await prisma.template.count({
      where: {
        applicationId: application.id,
        name: validTemplate.name,
      },
    });

    expect(count).toBe(1);
  });

  it('rejeita dados inválidos ou incompletos', async () => {
    const { apiKey } = await createApplication();

    const invalidTemplate = {
      name: 'Pedido Confirmado',
      subject: '   ',
    };

    const response = await request(app.getHttpServer())
      .post('/api/templates')
      .set('X-API-Key', apiKey)
      .send(invalidTemplate)
      .expect(400);

    expect(response.body.message).toBeDefined();
  });

  it('rejeita applicationId informado pelo consumidor', async () => {
    const { apiKey } = await createApplication();

    await request(app.getHttpServer())
      .post('/api/templates')
      .set('X-API-Key', apiKey)
      .send({
        ...validTemplate,
        applicationId: randomUUID(),
      })
      .expect(400);
  });

  it('permite mesmo nome em aplicações diferentes', async () => {
    const appA = await createApplication();
    const appB = await createApplication();

    const responseA = await request(app.getHttpServer())
      .post('/api/templates')
      .set('X-API-Key', appA.apiKey)
      .send(validTemplate)
      .expect(201);

    const responseB = await request(app.getHttpServer())
      .post('/api/templates')
      .set('X-API-Key', appB.apiKey)
      .send(validTemplate)
      .expect(201);

    expect(responseA.body.id).not.toBe(responseB.body.id);

    const templates = await prisma.template.findMany({
      where: {
        id: {
          in: [responseA.body.id, responseB.body.id],
        },
      },
    });

    expect(templates).toHaveLength(2);

    expect(
      templates.find((template) => template.id === responseA.body.id)
        ?.applicationId,
    ).toBe(appA.application.id);

    expect(
      templates.find((template) => template.id === responseB.body.id)
        ?.applicationId,
    ).toBe(appB.application.id);
  });

  it('rejeita aplicação inativa', async () => {
    const { apiKey } = await createApplication(false);

    await request(app.getHttpServer())
      .post('/api/templates')
      .set('X-API-Key', apiKey)
      .send(validTemplate)
      .expect(401);
  });
});
