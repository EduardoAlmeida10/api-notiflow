import { randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../src/application/ports/notification.repository';

import {
  TEMPLATE_REPOSITORY,
  type TemplateRepository,
} from '../src/application/ports/template.repository';

import { PersistenceModule } from '../src/composition/persistence.module';
import { Notification, NotificationStatus } from '../src/domain/notification';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('NotificationRepository (integração)', () => {
  let moduleRef: TestingModule;
  let repository: NotificationRepository;
  let templateRepository: TemplateRepository;
  let prisma: PrismaService;

  const applicationIds: string[] = [];

  async function createApplication() {
    const application = await prisma.application.create({
      data: {
        name: 'Aplicação de teste',
        apiKeyHash: `teste-${randomUUID()}`,
      },
    });

    applicationIds.push(application.id);
    return application;
  }

  async function createTemplate(applicationId: string) {
    return templateRepository.create({
      applicationId,
      name: `template-${randomUUID()}`,
      subject: 'Olá, {{nome}}!',
      body: 'Sua solicitação foi recebida.',
    });
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PersistenceModule],
    }).compile();

    repository = moduleRef.get<NotificationRepository>(NOTIFICATION_REPOSITORY);

    templateRepository = moduleRef.get<TemplateRepository>(TEMPLATE_REPOSITORY);

    prisma = moduleRef.get(PrismaService);

    await moduleRef.init();
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
      await moduleRef?.close();
    }
  });

  it('cria e consulta uma notificação com status PENDING', async () => {
    const application = await createApplication();
    const template = await createTemplate(application.id);

    const data = {
      applicationId: application.id,
      templateId: template.id,
      recipient: 'cliente@exemplo.com',
      data: {
        nome: 'Eduardo',
        pedido: 123,
      },
      idempotencyKey: null,
      payloadHash: null,
    };

    const created = await repository.create(data);

    const persisted = await prisma.notification.findUnique({
      where: { id: created.id },
    });

    const found = await repository.findById(created.id, application.id);

    expect(created).toBeInstanceOf(Notification);
    expect(created.status).toBe(NotificationStatus.PENDING);
    expect(created.sentAt).toBeNull();
    expect(created.data).toEqual(data.data);

    expect(persisted).not.toBeNull();
    expect(persisted?.recipient).toBe(data.recipient);
    expect(persisted?.data).toEqual(data.data);

    expect(found).toEqual(created);
  });

  it('impede uma aplicação de consultar notificações de outra', async () => {
    const applicationA = await createApplication();
    const applicationB = await createApplication();
    const template = await createTemplate(applicationA.id);

    const notification = await repository.create({
      applicationId: applicationA.id,
      templateId: template.id,
      recipient: 'cliente@exemplo.com',
      data: {},
      idempotencyKey: null,
      payloadHash: null,
    });

    const found = await repository.findById(notification.id, applicationB.id);

    expect(found).toBeNull();
  });

  it('impede chaves de idempotência duplicadas na mesma aplicação', async () => {
    const application = await createApplication();
    const template = await createTemplate(application.id);

    const data = {
      applicationId: application.id,
      templateId: template.id,
      recipient: 'cliente@exemplo.com',
      data: { nome: 'Eduardo' },
      idempotencyKey: `pedido-${randomUUID()}`,
      payloadHash: 'hash-teste',
    };

    const created = await repository.create(data);

    const found = await repository.findByIdempotencyKey(
      application.id,
      data.idempotencyKey,
    );

    expect(found).toEqual(created);

    await expect(repository.create(data)).rejects.toMatchObject({
      code: 'P2002',
    });

    const count = await prisma.notification.count({
      where: {
        applicationId: application.id,
        idempotencyKey: data.idempotencyKey,
      },
    });

    expect(count).toBe(1);
  });

  it('permite a mesma chave de idempotência em aplicações diferentes', async () => {
    const applicationA = await createApplication();
    const applicationB = await createApplication();

    const templateA = await createTemplate(applicationA.id);
    const templateB = await createTemplate(applicationB.id);

    const key = `pedido-${randomUUID()}`;

    const notificationA = await repository.create({
      applicationId: applicationA.id,
      templateId: templateA.id,
      recipient: 'a@exemplo.com',
      data: {},
      idempotencyKey: key,
      payloadHash: 'hash-a',
    });

    const notificationB = await repository.create({
      applicationId: applicationB.id,
      templateId: templateB.id,
      recipient: 'b@exemplo.com',
      data: {},
      idempotencyKey: key,
      payloadHash: 'hash-b',
    });

    expect(notificationA.id).not.toBe(notificationB.id);

    const foundA = await repository.findByIdempotencyKey(applicationA.id, key);

    const foundB = await repository.findByIdempotencyKey(applicationB.id, key);

    expect(foundA?.id).toBe(notificationA.id);
    expect(foundB?.id).toBe(notificationB.id);
  });

  it('atualiza o status para SENT e registra sentAt', async () => {
    const application = await createApplication();
    const template = await createTemplate(application.id);

    const notification = await repository.create({
      applicationId: application.id,
      templateId: template.id,
      recipient: 'cliente@exemplo.com',
      data: {},
      idempotencyKey: null,
      payloadHash: null,
    });

    const sentAt = new Date();

    const updated = await repository.updateStatus(
      notification.id,
      NotificationStatus.SENT,
      sentAt,
    );

    const persisted = await prisma.notification.findUnique({
      where: { id: notification.id },
    });

    expect(updated.status).toBe(NotificationStatus.SENT);
    expect(updated.sentAt).toEqual(sentAt);

    expect(persisted?.status).toBe('SENT');
    expect(persisted?.sentAt).toEqual(sentAt);
  });
});
