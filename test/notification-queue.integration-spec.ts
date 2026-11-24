import { randomUUID } from 'node:crypto';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import {
  NOTIFICATION_QUEUE,
  type NotificationQueue,
} from '../src/application/ports/notification-queue';
import { NotificationQueueModule } from '../src/composition/notification-queue.module';
import {
  NOTIFICATION_QUEUE_NAME,
  SEND_NOTIFICATION_JOB,
} from '../src/infrastructure/config/notification-queue.config';

describe('BullmqNotificationQueue (integração Redis)', () => {
  let moduleRef: TestingModule;
  let adapter: NotificationQueue;
  let queue: Queue;
  const notificationId = randomUUID();

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        NotificationQueueModule,
      ],
    }).compile();
    await moduleRef.init();
    adapter = moduleRef.get<NotificationQueue>(NOTIFICATION_QUEUE);
    queue = moduleRef.get<Queue>(getQueueToken(NOTIFICATION_QUEUE_NAME));
  });

  afterAll(async () => {
    const job = await queue?.getJob(notificationId);
    await job?.remove();
    await moduleRef?.close();
  });

  it('publica uma tarefa identificada pelo ID da notificação', async () => {
    await adapter.enqueue(notificationId);
    const job = await queue.getJob(notificationId);
    expect(job).toBeDefined();
    expect(job?.name).toBe(SEND_NOTIFICATION_JOB);
    expect(job?.data).toEqual({ notificationId });
    expect(await job?.getState()).toBe('waiting');
  });
});
