import type { ConfigService } from '@nestjs/config';

export const NOTIFICATION_QUEUE_NAME = 'notifications';
export const SEND_NOTIFICATION_JOB = 'send-notification';

export function notificationRetryConfig(config: ConfigService) {
  const attempts = Number(
    config.get<string>('NOTIFICATION_MAX_ATTEMPTS')?.trim() || '3',
  );
  const delay = Number(
    config.get<string>('NOTIFICATION_BACKOFF_MS')?.trim() || '1000',
  );
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 20) {
    throw new Error(
      'NOTIFICATION_MAX_ATTEMPTS deve ser um inteiro entre 1 e 20.',
    );
  }
  if (!Number.isSafeInteger(delay) || delay < 1 || delay > 3600000) {
    throw new Error(
      'NOTIFICATION_BACKOFF_MS deve ser um inteiro entre 1 e 3600000.',
    );
  }
  return { attempts, backoff: { type: 'exponential' as const, delay } };
}
