import { Module } from '@nestjs/common';

import { APPLICATION_REPOSITORY } from '../application/ports/application.repository';
import { TEMPLATE_REPOSITORY } from '../application/ports/template.repository';
import { NOTIFICATION_REPOSITORY } from '../application/ports/notification.repository';
import { DELIVERY_ATTEMPT_REPOSITORY } from '../application/ports/delivery-attempt.repository';

import { PrismaApplicationRepository } from '../adapters/outbound/persistence/prisma-application.repository';
import { PrismaTemplateRepository } from '../adapters/outbound/persistence/prisma-template.repository';
import { PrismaNotificationRepository } from '../adapters/outbound/persistence/prisma-notification.repository';
import { PrismaDeliveryAttemptRepository } from '../adapters/outbound/persistence/prisma-delivery-attempt.repository';

import { PrismaModule } from '../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: APPLICATION_REPOSITORY,
      useClass: PrismaApplicationRepository,
    },
    {
      provide: TEMPLATE_REPOSITORY,
      useClass: PrismaTemplateRepository,
    },
    {
      provide: NOTIFICATION_REPOSITORY,
      useClass: PrismaNotificationRepository,
    },
    {
      provide: DELIVERY_ATTEMPT_REPOSITORY,
      useClass: PrismaDeliveryAttemptRepository,
    },
  ],
  exports: [
    APPLICATION_REPOSITORY,
    TEMPLATE_REPOSITORY,
    NOTIFICATION_REPOSITORY,
    DELIVERY_ATTEMPT_REPOSITORY,
  ],
})
export class PersistenceModule {}
