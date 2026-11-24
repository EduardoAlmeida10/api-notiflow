import { createTransport, type Transporter } from 'nodemailer';
import { DeliveryFailure } from '../../../application/errors/delivery.errors';
import type {
  EmailMessage,
  NotificationSender,
} from '../../../application/ports/notification-sender';
import type { SmtpConfig } from '../../../infrastructure/config/smtp.config';

export class NodemailerEmailSender implements NotificationSender {
  private readonly transporter: Transporter;

  constructor(private readonly config: SmtpConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async send(message: EmailMessage): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: message.recipient,
        subject: message.subject,
        text: message.body,
      });
    } catch (error: unknown) {
      const details =
        typeof error === 'object' && error !== null
          ? (error as { responseCode?: unknown; code?: unknown })
          : {};
      const responseCode =
        typeof details.responseCode === 'number'
          ? details.responseCode
          : undefined;
      const temporaryCodes = new Set([
        'ECONNECTION',
        'ETIMEDOUT',
        'ESOCKET',
        'ECONNRESET',
        'ECONNREFUSED',
        'EAI_AGAIN',
        'EDNS',
      ]);
      const retryable =
        responseCode !== undefined
          ? responseCode >= 400 && responseCode < 500
          : typeof details.code === 'string' &&
            temporaryCodes.has(details.code);
      throw new DeliveryFailure(retryable);
    }
  }
}
