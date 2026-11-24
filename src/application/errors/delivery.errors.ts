export class DeliveryFailure extends Error {
  constructor(
    public readonly retryable: boolean,
    message = 'Falha no envio da notificação.',
  ) {
    super(message);
    this.name = 'DeliveryFailure';
  }
}
