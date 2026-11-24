import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NodemailerEmailSender } from '../adapters/outbound/email/nodemailer-email-sender';
import { SimulatedNotificationSender } from '../adapters/outbound/email/simulated-notification-sender';
import { NOTIFICATION_SENDER } from '../application/ports/notification-sender';
import { emailProviderConfig } from '../infrastructure/config/email-provider.config';
import { smtpConfig } from '../infrastructure/config/smtp.config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NOTIFICATION_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const selected = emailProviderConfig(config);
        return selected.provider === 'simulated'
          ? new SimulatedNotificationSender(selected.mode)
          : new NodemailerEmailSender(smtpConfig(config));
      },
    },
  ],
  exports: [NOTIFICATION_SENDER],
})
export class EmailModule {}
