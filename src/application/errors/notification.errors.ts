export class TemplateNotFoundError extends Error {
  constructor() {
    super('Template não encontrado para esta aplicação');
    this.name = 'TemplateNotFoundError';
  }
}

export class NotificationEnqueueError extends Error {
  constructor() {
    super('Não foi possível confirmar o enfileiramento da notificação');
    this.name = 'NotificationEnqueueError';
  }
}
