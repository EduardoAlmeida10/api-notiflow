export enum DeliveryAttemptStatus {
  SUCCESS = 'SUCCESS',
  TEMPORARY_FAILURE = 'TEMPORARY_FAILURE',
  PERMANENT_FAILURE = 'PERMANENT_FAILURE',
}

export class DeliveryAttempt {
  constructor(
    public readonly id: string,
    public readonly notificationId: string,
    public readonly attemptNumber: number,
    public readonly status: DeliveryAttemptStatus,
    public readonly errorCode: string | null,
    public readonly errorMessage: string | null,
    public readonly attemptedAt: Date,
  ) {}
}
