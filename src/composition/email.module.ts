import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NodemailerEmailSender } from '../adapters/outbound/email/nodemailer-email-sender';
import { NOTIFICATION_SENDER } from '../application/ports/notification-sender';
import { smtpConfig } from '../infrastructure/config/smtp.config';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: NOTIFICATION_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new NodemailerEmailSender(smtpConfig(config)),
    },
  ],
  exports: [NOTIFICATION_SENDER],
})
export class EmailModule {}
