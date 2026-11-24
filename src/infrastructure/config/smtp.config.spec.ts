import { ConfigService } from '@nestjs/config';
import { smtpConfig } from './smtp.config';

describe('smtpConfig', () => {
  const config = (values: Record<string, string>) => new ConfigService(values);
  const valid = { SMTP_HOST: 'localhost', SMTP_FROM: 'teste@example.com' };

  it('aplica os padrões de porta e conexão', () => {
    expect(smtpConfig(config(valid))).toEqual({
      host: 'localhost',
      port: 1025,
      secure: false,
      from: 'teste@example.com',
    });
  });

  it('aceita autenticação e conexão segura configuradas', () => {
    expect(
      smtpConfig(
        config({
          ...valid,
          SMTP_PORT: '465',
          SMTP_SECURE: 'true',
          SMTP_USER: 'usuario',
          SMTP_PASSWORD: 'senha',
        }),
      ),
    ).toMatchObject({
      port: 465,
      secure: true,
      auth: { user: 'usuario', pass: 'senha' },
    });
  });

  it.each([
    { SMTP_FROM: 'teste@example.com' },
    { SMTP_HOST: 'localhost' },
    { ...valid, SMTP_PORT: '0' },
    { ...valid, SMTP_SECURE: 'sim' },
    { ...valid, SMTP_USER: 'usuario' },
    { ...valid, SMTP_PASSWORD: 'senha' },
  ])('rejeita configuração incompleta ou inválida', (values) => {
    expect(() => smtpConfig(config(values))).toThrow();
  });
});
