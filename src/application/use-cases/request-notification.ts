import type { Notification } from '../../domain/notification';

import type { TemplateRepository } from '../ports/template.repository';
import type { NotificationRepository } from '../ports/notification.repository';
import type { NotificationQueue } from '../ports/notification-queue';

import {
  NotificationEnqueueError,
  TemplateNotFoundError,
} from '../errors/notification.errors';

export interface RequestNotificationInput {
  applicationId: string;
  templateId: string;
  recipient: string;
  data: Record<string, unknown>;
}

export class RequestNotification {
  constructor(
    private readonly templateRepository: TemplateRepository,
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationQueue: NotificationQueue,
  ) {}

  async execute(input: RequestNotificationInput): Promise<Notification> {
    const template = await this.templateRepository.findById(
      input.templateId,
      input.applicationId,
    );

    if (!template) {
      throw new TemplateNotFoundError();
    }

    const notification = await this.notificationRepository.create({
      applicationId: input.applicationId,
      templateId: template.id,
      recipient: input.recipient,
      data: input.data,
      idempotencyKey: null,
      payloadHash: null,
    });

    try {
      await this.notificationQueue.enqueue(notification.id);
    } catch {
      throw new NotificationEnqueueError();
    }

    return notification;
  }
}
