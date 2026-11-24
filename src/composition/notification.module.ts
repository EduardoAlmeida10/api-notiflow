import { Module } from '@nestjs/common';

import {
  TEMPLATE_REPOSITORY,
  type TemplateRepository,
} from '../application/ports/template.repository';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepository,
} from '../application/ports/notification.repository';

import {
  NOTIFICATION_QUEUE,
  type NotificationQueue,
} from '../application/ports/notification-queue';

import { REQUEST_NOTIFICATION } from '../application/tokens/notification.tokens';
import { RequestNotification } from '../application/use-cases/request-notification';

import { NotificationController } from '../adapters/inbound/http/notification.controller';

import { AuthenticationModule } from './authentication.module';
import { PersistenceModule } from './persistence.module';
import { NotificationQueueModule } from './notification-queue.module';

@Module({
  imports: [AuthenticationModule, PersistenceModule, NotificationQueueModule],
  controllers: [NotificationController],
  providers: [
    {
      provide: REQUEST_NOTIFICATION,
      useFactory: (
        templateRepository: TemplateRepository,
        notificationRepository: NotificationRepository,
        notificationQueue: NotificationQueue,
      ) =>
        new RequestNotification(
          templateRepository,
          notificationRepository,
          notificationQueue,
        ),
      inject: [
        TEMPLATE_REPOSITORY,
        NOTIFICATION_REPOSITORY,
        NOTIFICATION_QUEUE,
      ],
    },
  ],
})
export class NotificationModule {}
