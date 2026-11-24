import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { NotificationQueue } from '../../../application/ports/notification-queue';
import {
  NOTIFICATION_QUEUE_NAME,
  SEND_NOTIFICATION_JOB,
  notificationRetryConfig,
} from '../../../infrastructure/config/notification-queue.config';

@Injectable()
export class BullmqNotificationQueue implements NotificationQueue {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE_NAME) private readonly queue: Queue,
    private readonly config: ConfigService,
  ) {}

  async enqueue(notificationId: string): Promise<void> {
    await this.queue.add(
      SEND_NOTIFICATION_JOB,
      { notificationId },
      { jobId: notificationId, ...notificationRetryConfig(this.config) },
    );
  }
}
