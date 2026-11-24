import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullmqNotificationQueue } from '../adapters/outbound/queue/bullmq-notification-queue';
import { NOTIFICATION_QUEUE } from '../application/ports/notification-queue';
import { NOTIFICATION_QUEUE_NAME } from '../infrastructure/config/notification-queue.config';
import { redisConnection } from '../infrastructure/config/redis.config';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          ...redisConnection(config),
          maxRetriesPerRequest: 1,
          enableOfflineQueue: false,
        },
      }),
    }),
    BullModule.registerQueue({ name: NOTIFICATION_QUEUE_NAME }),
  ],
  providers: [
    BullmqNotificationQueue,
    { provide: NOTIFICATION_QUEUE, useExisting: BullmqNotificationQueue },
  ],
  exports: [NOTIFICATION_QUEUE],
})
export class NotificationQueueModule {}
