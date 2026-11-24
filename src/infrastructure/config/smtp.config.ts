import type { ConfigService } from '@nestjs/config';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  auth?: { user: string; pass: string };
}

export function smtpConfig(config: ConfigService): SmtpConfig {
  const host = config.get<string>('SMTP_HOST')?.trim();
  const from = config.get<string>('SMTP_FROM')?.trim();
  const port = Number(config.get<string>('SMTP_PORT')?.trim() || '1025');
  const secureValue = config.get<string>('SMTP_SECURE')?.trim() || 'false';
  const user = config.get<string>('SMTP_USER')?.trim();
  const pass = config.get<string>('SMTP_PASSWORD');

  if (!host || !from)
    throw new Error('SMTP_HOST e SMTP_FROM são obrigatórios.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT deve ser um inteiro entre 1 e 65535.');
  }
  if (secureValue !== 'true' && secureValue !== 'false') {
    throw new Error('SMTP_SECURE deve ser true ou false.');
  }
  if (Boolean(user) !== Boolean(pass)) {
    throw new Error('SMTP_USER e SMTP_PASSWORD devem ser informados juntos.');
  }
  return {
    host,
    port,
    secure: secureValue === 'true',
    from,
    ...(user && pass ? { auth: { user, pass } } : {}),
  };
}
