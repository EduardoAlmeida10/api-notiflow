import { DeliveryFailure } from '../../../application/errors/delivery.errors';
import type { NotificationSender } from '../../../application/ports/notification-sender';

export type SimulatedDeliveryMode =
  'success' | 'temporary_failure' | 'permanent_failure';

export class SimulatedNotificationSender implements NotificationSender {
  constructor(private readonly mode: SimulatedDeliveryMode) {}

  async send(): Promise<void> {
    if (this.mode === 'temporary_failure') {
      throw new DeliveryFailure(true, 'Falha temporária simulada.');
    }
    if (this.mode === 'permanent_failure') {
      throw new DeliveryFailure(false, 'Falha permanente simulada.');
    }
    await Promise.resolve();
  }
}
