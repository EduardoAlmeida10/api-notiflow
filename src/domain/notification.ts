export enum NotificationStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export class Notification {
  constructor(
    public readonly id: string,
    public readonly applicationId: string,
    public readonly templateId: string,
    public readonly recipient: string,
    public readonly data: Record<string, unknown>,
    public readonly status: NotificationStatus,
    public readonly idempotencyKey: string | null,
    public readonly payloadHash: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly sentAt: Date | null,
  ) {}
}
