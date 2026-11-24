import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import {
  NOTIFICATION_SENDER,
  type NotificationSender,
} from '../application/ports/notification-sender';
import { EmailModule } from './email.module';

const message = {
  recipient: 'teste@example.com',
  subject: 'Teste',
  body: 'Olá!',
};

describe('EmailModule com provedor simulado', () => {
  async function createSender(mode: string) {
    const moduleRef = await Test.createTestingModule({ imports: [EmailModule] })
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          EMAIL_PROVIDER: 'simulated',
          SIMULATED_DELIVERY_MODE: mode,
        }),
      )
      .compile();
    return {
      moduleRef,
      sender: moduleRef.get<NotificationSender>(NOTIFICATION_SENDER),
    };
  }

  it('simula sucesso sem configuração SMTP', async () => {
    const { moduleRef, sender } = await createSender('success');
    try {
      await expect(sender.send(message)).resolves.toBeUndefined();
    } finally {
      await moduleRef.close();
    }
  });

  it.each([
    ['temporary_failure', true],
    ['permanent_failure', false],
  ])('simula %s com retryable=%s', async (mode, retryable) => {
    const { moduleRef, sender } = await createSender(mode);
    try {
      await expect(sender.send(message)).rejects.toMatchObject({
        name: 'DeliveryFailure',
        retryable,
      });
    } finally {
      await moduleRef.close();
    }
  });

  it('rejeita modo inválido', async () => {
    await expect(createSender('desconhecido')).rejects.toThrow(
      'SIMULATED_DELIVERY_MODE',
    );
  });
});
