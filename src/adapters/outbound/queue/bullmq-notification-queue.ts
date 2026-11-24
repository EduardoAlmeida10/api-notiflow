import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { NotificationQueue } from '../../../application/ports/notification-queue';
import {
  NOTIFICATION_QUEUE_NAME,
  SEND_NOTIFICATION_JOB,
} from '../../../infrastructure/config/notification-queue.config';

@Injectable()
export class BullmqNotificationQueue implements NotificationQueue {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async enqueue(notificationId: string): Promise<void> {
    await this.queue.add(
      SEND_NOTIFICATION_JOB,
      { notificationId },
      { jobId: notificationId },
    );
  }
}
