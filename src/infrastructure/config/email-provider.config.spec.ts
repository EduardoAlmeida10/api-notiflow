import { ConfigService } from '@nestjs/config';
import { emailProviderConfig } from './email-provider.config';

describe('emailProviderConfig', () => {
  it('mantém SMTP como padrão', () => {
    expect(emailProviderConfig(new ConfigService({}))).toEqual({
      provider: 'smtp',
    });
  });
  it('rejeita provedor desconhecido', () => {
    expect(() =>
      emailProviderConfig(new ConfigService({ EMAIL_PROVIDER: 'erro' })),
    ).toThrow('EMAIL_PROVIDER');
  });
  it('exige modo explícito para simulação', () => {
    expect(() =>
      emailProviderConfig(new ConfigService({ EMAIL_PROVIDER: 'simulated' })),
    ).toThrow('SIMULATED_DELIVERY_MODE');
  });
});
