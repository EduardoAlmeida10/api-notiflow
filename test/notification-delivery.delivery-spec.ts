import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SMTPServer } from 'smtp-server';
import request from 'supertest';
import { Queue } from 'bullmq';
import { AppModule } from '../src/app.module';
import { WorkerModule } from '../src/composition/worker.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { NOTIFICATION_QUEUE_NAME } from '../src/infrastructure/config/notification-queue.config';
import { PrismaNotificationRepository } from '../src/adapters/outbound/persistence/prisma-notification.repository';

jest.setTimeout(30000);

describe('Fluxo de envio (integração)', () => {
  let smtp: SMTPServer;
  let app: INestApplication;
  let worker: INestApplicationContext;
  let prisma: PrismaService;
  let queue: Queue;
  let message = '';
  const applicationId = randomUUID();
  const apiKey = `nf_${randomBytes(32).toString('hex')}`;
  const notificationIds: string[] = [];
  let templateId: string;

  beforeAll(async () => {
    smtp = new SMTPServer({
      authOptional: true,
      disabledCommands: ['STARTTLS', 'AUTH'],
      onData(stream, _session, callback) {
        message = '';
        stream.on('data', (chunk: Buffer) => {
          message += chunk.toString();
        });
        stream.on('end', () => callback());
      },
    });
    await new Promise<void>((resolve) => smtp.listen(0, '127.0.0.1', resolve));
    process.env.SMTP_HOST = '127.0.0.1';
    process.env.SMTP_PORT = String((smtp.server.address() as AddressInfo).port);
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_FROM = 'origem@example.com';
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASSWORD;
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.application.create({
      data: {
        id: applicationId,
        name: 'Teste de envio',
        apiKeyHash: createHash('sha256').update(apiKey).digest('hex'),
      },
    });
    const template = await prisma.template.create({
      data: {
        applicationId,
        name: 'envio_teste',
        subject: 'Olá {{nome}}',
        body: 'Pedido para {{nome}}',
      },
    });
    templateId = template.id;
    queue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    });
    worker = await NestFactory.createApplicationContext(WorkerModule, {
      logger: false,
    });
  });

  afterAll(async () => {
    if (worker) await worker.close();
    if (queue) {
      for (const id of notificationIds)
        await (await queue.getJob(id))?.remove();
      await queue.close();
    }
    if (prisma) {
      await prisma.deliveryAttempt.deleteMany({
        where: { notification: { applicationId } },
      });
      await prisma.notification.deleteMany({ where: { applicationId } });
      await prisma.template.deleteMany({ where: { applicationId } });
      await prisma.application.deleteMany({ where: { id: applicationId } });
    }
    if (app) await app.close();
    if (smtp) await new Promise<void>((resolve) => smtp.close(() => resolve()));
  });

  async function waitFor(id: string, expected: string) {
    for (let i = 0; i < 100; i++) {
      const notification = await prisma.notification.findUniqueOrThrow({
        where: { id },
      });
      if (notification.status === expected) return notification;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Notificação não chegou ao status ${expected}`);
  }

  it('recebe solicitação, envia email preenchido e registra sucesso', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/api/notifications')
      .set('X-API-Key', apiKey)
      .send({
        templateId,
        recipient: 'destino@example.com',
        data: { nome: 'Luis' },
      })
      .expect(202);
    const id = (response.body as { id: string }).id;
    notificationIds.push(id);
    const notification = await waitFor(id, 'SENT');
    expect(notification.sentAt).not.toBeNull();
    expect(message).toContain('Pedido para Luis');
    const attempts = await prisma.deliveryAttempt.findMany({
      where: { notificationId: id },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe('SUCCESS');
  });

  it('registra falha permanente quando uma variável está ausente', async () => {
    const response = await request(app.getHttpServer() as Server)
      .post('/api/notifications')
      .set('X-API-Key', apiKey)
      .send({ templateId, recipient: 'destino@example.com', data: {} })
      .expect(202);
    const id = (response.body as { id: string }).id;
    notificationIds.push(id);
    await waitFor(id, 'FAILED');
    const attempts = await prisma.deliveryAttempt.findMany({
      where: { notificationId: id },
    });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].status).toBe('PERMANENT_FAILURE');
  });

  it('permite que apenas um worker reserve a notificação pendente', async () => {
    const notification = await prisma.notification.create({
      data: {
        applicationId,
        templateId,
        recipient: 'destino@example.com',
        data: {},
      },
    });
    notificationIds.push(notification.id);
    const repository = new PrismaNotificationRepository(prisma);
    const claims = await Promise.all([
      repository.claimPending(notification.id),
      repository.claimPending(notification.id),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(
      (
        await prisma.notification.findUniqueOrThrow({
          where: { id: notification.id },
        })
      ).status,
    ).toBe('PROCESSING');
  });
});
