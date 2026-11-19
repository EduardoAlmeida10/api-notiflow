import type {
  Notification,
  NotificationStatus,
} from '../../domain/notification';

export interface CreateNotificationData {
  applicationId: string;
  templateId: string;
  recipient: string;
  data: Record<string, unknown>;
  idempotencyKey: string | null;
  payloadHash: string | null;
}

export interface NotificationRepository {
  create(data: CreateNotificationData): Promise<Notification>;

  findById(id: string, applicationId: string): Promise<Notification | null>;

  findByIdempotencyKey(
    applicationId: string,
    idempotencyKey: string,
  ): Promise<Notification | null>;

  updateStatus(
    id: string,
    status: NotificationStatus,
    sentAt?: Date | null,
  ): Promise<Notification>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');
