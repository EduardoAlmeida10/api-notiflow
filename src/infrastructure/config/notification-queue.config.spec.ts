import { ConfigService } from '@nestjs/config';
import { notificationRetryConfig } from './notification-queue.config';

describe('notificationRetryConfig', () => {
  it('define três tentativas e espera exponencial de um segundo por padrão', () => {
    expect(notificationRetryConfig(new ConfigService({}))).toEqual({
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  });

  it('usa os valores configurados', () => {
    expect(
      notificationRetryConfig(
        new ConfigService({
          NOTIFICATION_MAX_ATTEMPTS: '5',
          NOTIFICATION_BACKOFF_MS: '250',
        }),
      ),
    ).toEqual({ attempts: 5, backoff: { type: 'exponential', delay: 250 } });
  });

  it.each([
    { NOTIFICATION_MAX_ATTEMPTS: '0' },
    { NOTIFICATION_MAX_ATTEMPTS: '21' },
    { NOTIFICATION_MAX_ATTEMPTS: '1.5' },
    { NOTIFICATION_BACKOFF_MS: '0' },
    { NOTIFICATION_BACKOFF_MS: '3600001' },
    { NOTIFICATION_BACKOFF_MS: 'invalido' },
  ])('rejeita limites inválidos', (values) => {
    expect(() => notificationRetryConfig(new ConfigService(values))).toThrow();
  });
});
