import { createTransport, type Transporter } from 'nodemailer';
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
    await this.transporter.sendMail({
      from: this.config.from,
      to: message.recipient,
      subject: message.subject,
      text: message.body,
    });
  }
}
