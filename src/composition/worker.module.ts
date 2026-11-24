import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ExampleProcessor } from '../adapters/inbound/queue/example.processor';
import { NotificationProcessor } from '../adapters/inbound/queue/notification.processor';
import {
  DELIVERY_ATTEMPT_REPOSITORY,
  type DeliveryAttemptRepository,
} from '../application/ports/delivery-attempt.repository';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../application/ports/notification.repository';
import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../application/ports/notification-sender';
import {
  TEMPLATE_REPOSITORY,
  type TemplateRepository,
} from '../application/ports/template.repository';
import { TemplateRenderer } from '../application/services/template-renderer';
import { SendNotification } from '../application/use-cases/send-notification';
import { NOTIFICATION_QUEUE_NAME } from '../infrastructure/config/notification-queue.config';
import {
  EXAMPLE_QUEUE,
  redisConnection,
} from '../infrastructure/config/redis.config';
import { EmailModule } from './email.module';
import { PersistenceModule } from './persistence.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config),
      }),
    }),
    BullModule.registerQueue(
      { name: EXAMPLE_QUEUE },
      { name: NOTIFICATION_QUEUE_NAME },
    ),
    EmailModule,
    PersistenceModule,
  ],
  providers: [
    ExampleProcessor,
    NotificationProcessor,
    {
      provide: SendNotification,
      inject: [
        NOTIFICATION_REPOSITORY,
        TEMPLATE_REPOSITORY,
        DELIVERY_ATTEMPT_REPOSITORY,
        NOTIFICATION_SENDER,
      ],
      useFactory: (
        notifications: NotificationRepository,
        templates: TemplateRepository,
        attempts: DeliveryAttemptRepository,
        sender: NotificationSender,
      ) =>
        new SendNotification(
          notifications,
          templates,
          attempts,
          sender,
          new TemplateRenderer(),
        ),
    },
  ],
})
export class WorkerModule {}
