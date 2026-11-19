import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { Module, type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import {
  TEMPLATE_REPOSITORY,
  type TemplateRepository,
} from '../src/application/ports/template.repository';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../src/application/ports/notification.repository';

import {
  NOTIFICATION_QUEUE,
  type NotificationQueue,
} from '../src/application/ports/notification-queue';

import { REQUEST_NOTIFICATION } from '../src/application/tokens/notification.tokens';
import { RequestNotification } from '../src/application/use-cases/request-notification';

import { NotificationController } from '../src/adapters/inbound/http/notification.controller';

import { AuthenticationModule } from '../src/composition/authentication.module';
import { PersistenceModule } from '../src/composition/persistence.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

import { InMemoryNotificationQueue } from './doubles/in-memory-notification-queue';

@Module({
  imports: [AuthenticationModule, PersistenceModule],
  controllers: [NotificationController],
  providers: [
    {
      provide: NOTIFICATION_QUEUE,
      useClass: InMemoryNotificationQueue,
    },
    {
      provide: REQUEST_NOTIFICATION,
      useFactory: (
        templateRepository: TemplateRepository,
        notificationRepository: NotificationRepository,
        notificationQueue: NotificationQueue,
      ) =>
        new RequestNotification(
          templateRepository,
          notificationRepository,
          notificationQueue,
        ),
      inject: [
        TEMPLATE_REPOSITORY,
        NOTIFICATION_REPOSITORY,
        NOTIFICATION_QUEUE,
      ],
    },
  ],
})
class NotificationTestModule {}

describe('POST /api/notifications (integração)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let queue: InMemoryNotificationQueue;

  const applicationIds: string[] = [];

  function generateApiKey(): string {
    return `nf_${randomBytes(32).toString('hex')}`;
  }

  async function createApplication() {
    const apiKey = generateApiKey();

    const apiKeyHash = createHash('sha256')
      .update(apiKey, 'utf8')
      .digest('hex');

    const application = await prisma.application.create({
      data: {
        name: `Aplicação teste ${randomUUID()}`,
        apiKeyHash,
        isActive: true,
      },
    });

    applicationIds.push(application.id);

    return { application, apiKey };
  }

  async function createTemplate(applicationId: string) {
    return prisma.template.create({
      data: {
        applicationId,
        name: `template_${randomUUID().replaceAll('-', '')}`,
        subject: 'Pedido confirmado',
        body: 'Olá, {{nome}}!',
      },
    });
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        NotificationTestModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');

    prisma = moduleRef.get(PrismaService);
    queue = moduleRef.get<InMemoryNotificationQueue>(NOTIFICATION_QUEUE);

    await app.init();
  });

  beforeEach(() => {
    queue.clear();
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

  it('registra e enfileira uma notificação válida', async () => {
    const { application, apiKey } = await createApplication();
    const template = await createTemplate(application.id);

    const response = await request(app.getHttpServer())
      .post('/api/notifications')
      .set('X-API-Key', apiKey)
      .send({
        templateId: template.id,
        recipient: 'cliente@exemplo.com',
        data: { nome: 'Eduardo' },
      })
      .expect(202);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      status: 'PENDING',
      createdAt: expect.any(String),
    });

    const persisted = await prisma.notification.findUnique({
      where: { id: response.body.id },
    });

    expect(persisted).not.toBeNull();
    expect(persisted?.applicationId).toBe(application.id);
    expect(persisted?.templateId).toBe(template.id);
    expect(persisted?.data).toEqual({ nome: 'Eduardo' });

    expect(queue.jobs).toEqual([response.body.id]);
  });

  it('rejeita solicitações sem API Key', async () => {
    await request(app.getHttpServer())
      .post('/api/notifications')
      .send({
        templateId: randomUUID(),
        recipient: 'cliente@exemplo.com',
        data: {},
      })
      .expect(401);

    expect(queue.jobs).toHaveLength(0);
  });

  it('rejeita dados inválidos', async () => {
    const { apiKey } = await createApplication();

    await request(app.getHttpServer())
      .post('/api/notifications')
      .set('X-API-Key', apiKey)
      .send({
        templateId: 'id-invalido',
        recipient: 'email-invalido',
        data: [],
      })
      .expect(400);

    expect(queue.jobs).toHaveLength(0);
  });

  it('rejeita template inexistente', async () => {
    const { apiKey } = await createApplication();

    await request(app.getHttpServer())
      .post('/api/notifications')
      .set('X-API-Key', apiKey)
      .send({
        templateId: randomUUID(),
        recipient: 'cliente@exemplo.com',
        data: {},
      })
      .expect(404);

    expect(queue.jobs).toHaveLength(0);
  });

  it('impede utilizar template de outra aplicação', async () => {
    const applicationA = await createApplication();
    const applicationB = await createApplication();

    const template = await createTemplate(applicationA.application.id);

    await request(app.getHttpServer())
      .post('/api/notifications')
      .set('X-API-Key', applicationB.apiKey)
      .send({
        templateId: template.id,
        recipient: 'cliente@exemplo.com',
        data: {},
      })
      .expect(404);

    expect(queue.jobs).toHaveLength(0);
  });

  it('retorna 503 e preserva a notificação se a fila falhar', async () => {
    const { application, apiKey } = await createApplication();
    const template = await createTemplate(application.id);

    queue.shouldFail = true;

    const response = await request(app.getHttpServer())
      .post('/api/notifications')
      .set('X-API-Key', apiKey)
      .send({
        templateId: template.id,
        recipient: 'cliente@exemplo.com',
        data: { nome: 'Eduardo' },
      })
      .expect(503);

    expect(response.body.message).toContain('Não foi possível confirmar');

    const notifications = await prisma.notification.findMany({
      where: {
        applicationId: application.id,
        templateId: template.id,
      },
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].status).toBe('PENDING');
    expect(queue.jobs).toHaveLength(0);
  });
});
