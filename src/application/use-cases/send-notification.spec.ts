import { DeliveryAttemptStatus } from '../../domain/delivery-attempt';
import { Notification, NotificationStatus } from '../../domain/notification';
import { Template } from '../../domain/template';
import type { NotificationRepository } from '../ports/notification.repository';
import type { TemplateRepository } from '../ports/template.repository';
import type { DeliveryAttemptRepository } from '../ports/delivery-attempt.repository';
import type { NotificationSender } from '../ports/notification-sender';
import { TemplateRenderer } from '../services/template-renderer';
import { SendNotification } from './send-notification';
import { DeliveryFailure } from '../errors/delivery.errors';

describe('SendNotification', () => {
  const notification = new Notification(
    'id',
    'app',
    'template',
    'destino@example.com',
    { nome: 'Luis' },
    NotificationStatus.PROCESSING,
    null,
    null,
    new Date(),
    new Date(),
    null,
  );
  const template = new Template(
    'template',
    'app',
    'nome',
    'Olá {{nome}}',
    'Mensagem para {{nome}}',
    new Date(),
    new Date(),
  );
  let notifications: jest.Mocked<
    Pick<NotificationRepository, 'claimPending' | 'updateStatus'>
  >;
  let templates: jest.Mocked<Pick<TemplateRepository, 'findById'>>;
  let attempts: jest.Mocked<
    Pick<DeliveryAttemptRepository, 'findByNotificationId' | 'create'>
  >;
  let sender: jest.Mocked<NotificationSender>;
  let sendMock: jest.Mock;
  let useCase: SendNotification;

  beforeEach(() => {
    notifications = {
      claimPending: jest.fn().mockResolvedValue(notification),
      updateStatus: jest.fn().mockResolvedValue(notification),
    };
    templates = { findById: jest.fn().mockResolvedValue(template) };
    attempts = {
      findByNotificationId: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
    };
    sendMock = jest.fn().mockResolvedValue(undefined);
    sender = { send: sendMock };
    useCase = new SendNotification(
      notifications as unknown as NotificationRepository,
      templates as TemplateRepository,
      attempts,
      sender,
      new TemplateRenderer(),
    );
  });

  it('envia o template preenchido e registra sucesso', async () => {
    await useCase.execute('id');
    expect(sendMock).toHaveBeenCalledWith({
      recipient: 'destino@example.com',
      subject: 'Olá Luis',
      body: 'Mensagem para Luis',
    });
    expect(attempts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptNumber: 1,
        status: DeliveryAttemptStatus.SUCCESS,
      }),
    );
    expect(notifications.updateStatus).toHaveBeenCalledWith(
      'id',
      NotificationStatus.SENT,
      expect.any(Date),
    );
  });

  it('não envia outra vez quando a notificação não está pendente', async () => {
    notifications.claimPending.mockResolvedValue(null);
    await useCase.execute('id');
    expect(sendMock).not.toHaveBeenCalled();
    expect(attempts.create).not.toHaveBeenCalled();
  });

  it('registra falha permanente quando faltam dados do template', async () => {
    templates.findById.mockResolvedValue(
      new Template(
        'template',
        'app',
        'nome',
        '{{ausente}}',
        '',
        new Date(),
        new Date(),
      ),
    );
    await expect(useCase.execute('id')).rejects.toThrow();
    expect(sendMock).not.toHaveBeenCalled();
    expect(attempts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DeliveryAttemptStatus.PERMANENT_FAILURE,
      }),
    );
    expect(notifications.updateStatus).toHaveBeenCalledWith(
      'id',
      NotificationStatus.FAILED,
    );
  });

  it('registra falha do envio sem expor detalhes do provedor', async () => {
    sendMock.mockRejectedValue(new DeliveryFailure(true, 'informação interna'));
    await expect(useCase.execute('id')).rejects.toThrow();
    expect(attempts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DeliveryAttemptStatus.TEMPORARY_FAILURE,
        errorMessage: 'Falha ao processar ou enviar a notificação.',
      }),
    );
    expect(notifications.updateStatus).toHaveBeenCalledWith(
      'id',
      NotificationStatus.FAILED,
    );
  });

  it('recoloca em pendente uma falha temporária com tentativas restantes', async () => {
    sendMock.mockRejectedValue(new DeliveryFailure(true));
    await expect(useCase.execute('id', 3)).rejects.toBeInstanceOf(
      DeliveryFailure,
    );
    expect(notifications.updateStatus).toHaveBeenCalledWith(
      'id',
      NotificationStatus.PENDING,
    );
  });

  it('encerra falha permanente mesmo quando há tentativas restantes', async () => {
    sendMock.mockRejectedValue(new DeliveryFailure(false));
    await expect(useCase.execute('id', 3)).rejects.toBeInstanceOf(
      DeliveryFailure,
    );
    expect(attempts.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: DeliveryAttemptStatus.PERMANENT_FAILURE,
      }),
    );
    expect(notifications.updateStatus).toHaveBeenCalledWith(
      'id',
      NotificationStatus.FAILED,
    );
  });

  it('não registra falha de entrega quando persistir o sucesso falha', async () => {
    attempts.create.mockRejectedValue(new Error('banco indisponível'));
    await expect(useCase.execute('id')).rejects.toThrow('banco indisponível');
    expect(attempts.create).toHaveBeenCalledTimes(1);
    expect(notifications.updateStatus).not.toHaveBeenCalled();
  });
});
