import type {
  DeliveryAttempt,
  DeliveryAttemptStatus,
} from '../../domain/delivery-attempt';

export interface CreateDeliveryAttemptData {
  notificationId: string;
  attemptNumber: number;
  status: DeliveryAttemptStatus;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface DeliveryAttemptRepository {
  create(data: CreateDeliveryAttemptData): Promise<DeliveryAttempt>;

  findByNotificationId(
    notificationId: string,
    applicationId: string,
  ): Promise<DeliveryAttempt[]>;
}

export const DELIVERY_ATTEMPT_REPOSITORY = Symbol(
  'DELIVERY_ATTEMPT_REPOSITORY',
);
