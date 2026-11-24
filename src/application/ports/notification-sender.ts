export interface EmailMessage {
  recipient: string;
  subject: string;
  body: string;
}

export interface NotificationSender {
  send(message: EmailMessage): Promise<void>;
}

export const NOTIFICATION_SENDER = Symbol('NOTIFICATION_SENDER');
