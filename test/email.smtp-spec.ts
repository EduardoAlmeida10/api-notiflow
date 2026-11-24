import type { AddressInfo } from 'node:net';
import { SMTPServer } from 'smtp-server';
import { NodemailerEmailSender } from '../src/adapters/outbound/email/nodemailer-email-sender';

describe('NodemailerEmailSender (integração SMTP)', () => {
  let server: SMTPServer;
  let sender: NodemailerEmailSender;
  let received: string;
  let recipient: string;

  beforeAll(async () => {
    server = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS', 'AUTH'],
      onRcptTo(address, _session, callback) {
        if (address.address === 'rejeitado@example.com') {
          callback(
            Object.assign(new Error('Destinatário rejeitado'), {
              responseCode: 550,
            }),
          );
          return;
        }
        recipient = address.address;
        callback();
      },
      onData(stream, _session, callback) {
        received = '';
        stream.on('data', (chunk: Buffer) => {
          received += chunk.toString('utf8');
        });
        stream.on('end', () => callback());
      },
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    const address = server.server.address() as AddressInfo;
    sender = new NodemailerEmailSender({
      host: '127.0.0.1',
      port: address.port,
      secure: false,
      from: 'origem@example.com',
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error?: Error) => (error ? reject(error) : resolve())),
    );
  });

  it('envia destinatário, assunto e corpo ao servidor SMTP', async () => {
    await sender.send({
      recipient: 'destino@example.com',
      subject: 'Pedido confirmado',
      body: 'Seu pedido foi recebido.',
    });
    expect(recipient).toBe('destino@example.com');
    expect(received).toContain('From: origem@example.com');
    expect(received).toContain('Subject: Pedido confirmado');
    expect(received).toContain('Seu pedido foi recebido.');
  });

  it('propaga a rejeição do servidor SMTP', async () => {
    await expect(
      sender.send({
        recipient: 'rejeitado@example.com',
        subject: 'Teste',
        body: 'Mensagem',
      }),
    ).rejects.toThrow();
  });
});
