import { DeliveryAttemptStatus } from '../../domain/delivery-attempt';
import { NotificationStatus } from '../../domain/notification';
import { DeliveryFailure } from '../errors/delivery.errors';
import type { DeliveryAttemptRepository } from '../ports/delivery-attempt.repository';
import type { NotificationRepository } from '../ports/notification.repository';
import type { NotificationSender } from '../ports/notification-sender';
import type { TemplateRepository } from '../ports/template.repository';
import {
  TemplateRenderer,
  TemplateVariablesError,
} from '../services/template-renderer';

export class SendNotification {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly templates: TemplateRepository,
    private readonly attempts: DeliveryAttemptRepository,
    private readonly sender: NotificationSender,
    private readonly renderer: TemplateRenderer,
  ) {}

  async execute(notificationId: string, maxAttempts = 1): Promise<void> {
    const notification = await this.notifications.claimPending(notificationId);
    if (!notification) return;

    const previous = await this.attempts.findByNotificationId(
      notification.id,
      notification.applicationId,
    );
    const attemptNumber =
      previous.reduce((max, item) => Math.max(max, item.attemptNumber), 0) + 1;

    try {
      const template = await this.templates.findById(
        notification.templateId,
        notification.applicationId,
      );
      if (!template) throw new TemplateNotFoundForDeliveryError();
      const rendered = this.renderer.render(template, notification.data);
      await this.sender.send({
        recipient: notification.recipient,
        ...rendered,
      });
    } catch (error: unknown) {
      const invalidTemplate =
        error instanceof TemplateVariablesError ||
        error instanceof TemplateNotFoundForDeliveryError;
      const retryable = error instanceof DeliveryFailure && error.retryable;
      await this.attempts.create({
        notificationId: notification.id,
        attemptNumber,
        status: retryable
          ? DeliveryAttemptStatus.TEMPORARY_FAILURE
          : DeliveryAttemptStatus.PERMANENT_FAILURE,
        errorCode: invalidTemplate ? 'INVALID_TEMPLATE' : 'DELIVERY_ERROR',
        errorMessage: invalidTemplate
          ? error.message
          : 'Falha ao processar ou enviar a notificação.',
      });
      await this.notifications.updateStatus(
        notification.id,
        retryable && attemptNumber < maxAttempts
          ? NotificationStatus.PENDING
          : NotificationStatus.FAILED,
      );
      throw new DeliveryFailure(retryable);
    }

    await this.attempts.create({
      notificationId: notification.id,
      attemptNumber,
      status: DeliveryAttemptStatus.SUCCESS,
      errorCode: null,
      errorMessage: null,
    });
    await this.notifications.updateStatus(
      notification.id,
      NotificationStatus.SENT,
      new Date(),
    );
  }
}

class TemplateNotFoundForDeliveryError extends Error {
  constructor() {
    super('Template não encontrado para a aplicação da notificação.');
    this.name = 'TemplateNotFoundForDeliveryError';
  }
}
