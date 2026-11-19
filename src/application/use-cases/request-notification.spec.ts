import { randomUUID } from 'node:crypto';

import { Template } from '../../domain/template';
import { Notification, NotificationStatus } from '../../domain/notification';

import type { TemplateRepository } from '../ports/template.repository';
import type { NotificationRepository } from '../ports/notification.repository';
import type { NotificationQueue } from '../ports/notification-queue';

import {
  NotificationEnqueueError,
  TemplateNotFoundError,
} from '../errors/notification.errors';

import { RequestNotification } from './request-notification';

describe('RequestNotification', () => {
  const applicationId = randomUUID();
  const templateId = randomUUID();

  const template = new Template(
    templateId,
    applicationId,
    'pedido_confirmado',
    'Pedido confirmado',
    'Olá, {{nome}}!',
    new Date(),
    new Date(),
  );

  const input = {
    applicationId,
    templateId,
    recipient: 'cliente@exemplo.com',
    data: { nome: 'Eduardo' },
  };

  let templateRepository: TemplateRepository;
  let notificationRepository: NotificationRepository;
  let notificationQueue: NotificationQueue;

  let useCase: RequestNotification;

  let savedNotification: Notification | null;
  let enqueuedIds: string[];
  let queueShouldFail: boolean;

  beforeEach(() => {
    savedNotification = null;
    enqueuedIds = [];
    queueShouldFail = false;

    templateRepository = {
      async create() {
        return template;
      },

      async findById(id, appId) {
        if (id === templateId && appId === applicationId) {
          return template;
        }

        return null;
      },

      async findByName() {
        return null;
      },
    };

    notificationRepository = {
      async create(data) {
        const notification = new Notification(
          randomUUID(),
          data.applicationId,
          data.templateId,
          data.recipient,
          data.data,
          NotificationStatus.PENDING,
          data.idempotencyKey,
          data.payloadHash,
          new Date(),
          new Date(),
          null,
        );

        savedNotification = notification;

        return notification;
      },

      async findById() {
        return savedNotification;
      },

      async findByIdempotencyKey() {
        return null;
      },

      async updateStatus() {
        throw new Error('Não implementado no teste');
      },
    };

    notificationQueue = {
      async enqueue(notificationId) {
        if (queueShouldFail) {
          throw new Error('Redis indisponível');
        }

        enqueuedIds.push(notificationId);
      },
    };

    useCase = new RequestNotification(
      templateRepository,
      notificationRepository,
      notificationQueue,
    );
  });

  it('registra a notificação e solicita o enfileiramento', async () => {
    const result = await useCase.execute(input);

    expect(result.status).toBe(NotificationStatus.PENDING);
    expect(result.applicationId).toBe(applicationId);
    expect(result.templateId).toBe(templateId);
    expect(result.recipient).toBe(input.recipient);
    expect(result.data).toEqual(input.data);

    expect(savedNotification).toEqual(result);
    expect(enqueuedIds).toEqual([result.id]);
  });

  it('rejeita um template inexistente', async () => {
    await expect(
      useCase.execute({
        ...input,
        templateId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);

    expect(savedNotification).toBeNull();
    expect(enqueuedIds).toHaveLength(0);
  });

  it('rejeita um template de outra aplicação', async () => {
    await expect(
      useCase.execute({
        ...input,
        applicationId: randomUUID(),
      }),
    ).rejects.toBeInstanceOf(TemplateNotFoundError);

    expect(savedNotification).toBeNull();
    expect(enqueuedIds).toHaveLength(0);
  });

  it('retorna erro quando a fila falha', async () => {
    queueShouldFail = true;

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      NotificationEnqueueError,
    );

    expect(enqueuedIds).toHaveLength(0);
  });

  it('mantém a notificação registrada se a fila falhar', async () => {
    queueShouldFail = true;

    await expect(useCase.execute(input)).rejects.toBeInstanceOf(
      NotificationEnqueueError,
    );

    expect(savedNotification).not.toBeNull();
    expect(savedNotification?.status).toBe(NotificationStatus.PENDING);
  });
});
