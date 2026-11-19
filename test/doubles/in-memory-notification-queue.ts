import type { NotificationQueue } from '../../src/application/ports/notification-queue';

export class InMemoryNotificationQueue implements NotificationQueue {
  public readonly jobs: string[] = [];

  public shouldFail = false;

  async enqueue(notificationId: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Falha simulada na publicação');
    }

    this.jobs.push(notificationId);
  }

  clear(): void {
    this.jobs.length = 0;
    this.shouldFail = false;
  }
}
