import { ConfigService } from '@nestjs/config';

export const EXAMPLE_QUEUE = 'example';
export const EXAMPLE_JOB = 'example';

export function redisConnection(config: ConfigService) {
  const host = config.get<string>('REDIS_HOST')?.trim() || 'localhost';
  const port = Number(config.get<string>('REDIS_PORT')?.trim() || '6379');

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('REDIS_PORT deve ser um inteiro entre 1 e 65535.');
  }

  return { host, port };
}
