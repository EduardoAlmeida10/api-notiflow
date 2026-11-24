import type { ConfigService } from '@nestjs/config';
import type { SimulatedDeliveryMode } from '../../adapters/outbound/email/simulated-notification-sender';

export type EmailProviderConfig =
  { provider: 'smtp' } | { provider: 'simulated'; mode: SimulatedDeliveryMode };

export function emailProviderConfig(
  config: ConfigService,
): EmailProviderConfig {
  const provider = config.get<string>('EMAIL_PROVIDER')?.trim() || 'smtp';
  if (provider === 'smtp') return { provider };
  if (provider !== 'simulated')
    throw new Error('EMAIL_PROVIDER deve ser smtp ou simulated.');
  const mode = config.get<string>('SIMULATED_DELIVERY_MODE')?.trim();
  if (
    mode !== 'success' &&
    mode !== 'temporary_failure' &&
    mode !== 'permanent_failure'
  ) {
    throw new Error(
      'SIMULATED_DELIVERY_MODE deve ser success, temporary_failure ou permanent_failure.',
    );
  }
  return { provider, mode };
}
