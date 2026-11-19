import { randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  DELIVERY_ATTEMPT_REPOSITORY,
  type DeliveryAttemptRepository,
} from '../src/application/ports/delivery-attempt.repository';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../src/application/ports/notification.repository';

import {
  TEMPLATE_REPOSITORY,
  type TemplateRepository,
} from '../src/application/ports/template.repository';

import { PersistenceModule } from '../src/composition/persistence.module';
import {
  DeliveryAttempt,
  DeliveryAttemptStatus,
} from '../src/domain/delivery-attempt';

import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('DeliveryAttemptRepository (integração)', () => {
  let moduleRef: TestingModule;
  let repository: DeliveryAttemptRepository;
  let notificationRepository: NotificationRepository;
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

  async function createNotification() {
    const application = await createApplication();

    const template = await templateRepository.create({
      applicationId: application.id,
      name: `template-${randomUUID()}`,
      subject: 'Notificação de teste',
      body: 'Olá, {{nome}}!',
    });

    const notification = await notificationRepository.create({
      applicationId: application.id,
      templateId: template.id,
      recipient: 'cliente@exemplo.com',
      data: { nome: 'Eduardo' },
      idempotencyKey: null,
      payloadHash: null,
    });

    return { application, notification };
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PersistenceModule],
    }).compile();

    repository = moduleRef.get<DeliveryAttemptRepository>(
      DELIVERY_ATTEMPT_REPOSITORY,
    );

    notificationRepository = moduleRef.get<NotificationRepository>(
      NOTIFICATION_REPOSITORY,
    );

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

  it('registra uma tentativa de envio bem-sucedida', async () => {
    const { application, notification } = await createNotification();

    const created = await repository.create({
      notificationId: notification.id,
      attemptNumber: 1,
      status: DeliveryAttemptStatus.SUCCESS,
      errorCode: null,
      errorMessage: null,
    });

    const persisted = await prisma.deliveryAttempt.findUnique({
      where: { id: created.id },
    });

    expect(created).toBeInstanceOf(DeliveryAttempt);
    expect(created.status).toBe(DeliveryAttemptStatus.SUCCESS);
    expect(created.attemptNumber).toBe(1);
    expect(created.attemptedAt).toBeInstanceOf(Date);

    expect(persisted).not.toBeNull();
    expect(persisted?.notificationId).toBe(notification.id);
    expect(persisted?.status).toBe('SUCCESS');

    const history = await repository.findByNotificationId(
      notification.id,
      application.id,
    );

    expect(history).toEqual([created]);
  });

  it('registra falha temporária com código e mensagem', async () => {
    const { application, notification } = await createNotification();

    const created = await repository.create({
      notificationId: notification.id,
      attemptNumber: 1,
      status: DeliveryAttemptStatus.TEMPORARY_FAILURE,
      errorCode: 'SMTP_UNAVAILABLE',
      errorMessage: 'Servidor SMTP indisponível',
    });

    expect(created.status).toBe(DeliveryAttemptStatus.TEMPORARY_FAILURE);
    expect(created.errorCode).toBe('SMTP_UNAVAILABLE');
    expect(created.errorMessage).toBe('Servidor SMTP indisponível');

    const history = await repository.findByNotificationId(
      notification.id,
      application.id,
    );

    expect(history).toHaveLength(1);
    expect(history[0]).toEqual(created);
  });

  it('retorna o histórico ordenado por número da tentativa', async () => {
    const { application, notification } = await createNotification();

    await repository.create({
      notificationId: notification.id,
      attemptNumber: 3,
      status: DeliveryAttemptStatus.SUCCESS,
      errorCode: null,
      errorMessage: null,
    });

    await repository.create({
      notificationId: notification.id,
      attemptNumber: 1,
      status: DeliveryAttemptStatus.TEMPORARY_FAILURE,
      errorCode: 'TIMEOUT',
      errorMessage: 'Tempo limite excedido',
    });

    await repository.create({
      notificationId: notification.id,
      attemptNumber: 2,
      status: DeliveryAttemptStatus.TEMPORARY_FAILURE,
      errorCode: 'SMTP_UNAVAILABLE',
      errorMessage: 'Servidor indisponível',
    });

    const history = await repository.findByNotificationId(
      notification.id,
      application.id,
    );

    expect(history).toHaveLength(3);
    expect(history.map((attempt) => attempt.attemptNumber)).toEqual([1, 2, 3]);

    expect(history.map((attempt) => attempt.status)).toEqual([
      DeliveryAttemptStatus.TEMPORARY_FAILURE,
      DeliveryAttemptStatus.TEMPORARY_FAILURE,
      DeliveryAttemptStatus.SUCCESS,
    ]);
  });

  it('impede consultar tentativas de outra aplicação', async () => {
    const { notification } = await createNotification();
    const otherApplication = await createApplication();

    await repository.create({
      notificationId: notification.id,
      attemptNumber: 1,
      status: DeliveryAttemptStatus.SUCCESS,
      errorCode: null,
      errorMessage: null,
    });

    const history = await repository.findByNotificationId(
      notification.id,
      otherApplication.id,
    );

    expect(history).toEqual([]);
  });

  it('impede números de tentativa duplicados', async () => {
    const { notification } = await createNotification();

    const data = {
      notificationId: notification.id,
      attemptNumber: 1,
      status: DeliveryAttemptStatus.TEMPORARY_FAILURE,
      errorCode: 'TIMEOUT',
      errorMessage: 'Falha temporária',
    };

    await repository.create(data);

    await expect(repository.create(data)).rejects.toMatchObject({
      code: 'P2002',
    });

    const count = await prisma.deliveryAttempt.count({
      where: {
        notificationId: notification.id,
        attemptNumber: 1,
      },
    });

    expect(count).toBe(1);
  });
});
