import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
import { Job } from 'bullmq';
import { SendNotification } from '../../../application/use-cases/send-notification';
import {
  NOTIFICATION_QUEUE_NAME,
  SEND_NOTIFICATION_JOB,
} from '../../../infrastructure/config/notification-queue.config';

@Processor(NOTIFICATION_QUEUE_NAME)
export class NotificationProcessor extends WorkerHost {
  constructor(
    @Inject(SendNotification)
    private readonly sendNotification: SendNotification,
  ) {
    super();
  }

  async process(job: Job<{ notificationId: string }>): Promise<void> {
    if (
      job.name !== SEND_NOTIFICATION_JOB ||
      typeof job.data?.notificationId !== 'string' ||
      !job.data.notificationId
    ) {
      throw new Error('Tarefa de notificação inválida.');
    }
    await this.sendNotification.execute(job.data.notificationId);
  }
}
