import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { INestApplication, INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Queue } from 'bullmq';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { WorkerModule } from '../src/composition/worker.module';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { NOTIFICATION_QUEUE_NAME } from '../src/infrastructure/config/notification-queue.config';

jest.setTimeout(30000);

describe('Provedor simulado (integração)', () => {
  let app: INestApplication;
  let worker: INestApplicationContext | undefined;
  let prisma: PrismaService;
  let queue: Queue;
  const applicationId = randomUUID();
  const apiKey = `nf_${randomBytes(32).toString('hex')}`;
  const notificationIds: string[] = [];
  let templateId: string;

  beforeAll(async () => {
    process.env.EMAIL_PROVIDER = 'simulated';
    process.env.SIMULATED_DELIVERY_MODE = 'success';
    process.env.NOTIFICATION_MAX_ATTEMPTS = '3';
    process.env.NOTIFICATION_BACKOFF_MS = '50';
    app = await NestFactory.create(AppModule, { logger: false });
    app.setGlobalPrefix('api');
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.application.create({
      data: {
        id: applicationId,
        name: 'Teste simulado',
        apiKeyHash: createHash('sha256').update(apiKey).digest('hex'),
      },
    });
    const template = await prisma.template.create({
      data: {
        applicationId,
        name: 'simulado',
        subject: 'Olá {{nome}}',
        body: 'Mensagem de teste',
      },
    });
    templateId = template.id;
    queue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    });
  });

  afterEach(async () => {
    if (worker) {
      await worker.close();
      worker = undefined;
    }
  });

  afterAll(async () => {
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
  });

  it.each([
    ['success', 'SENT', ['SUCCESS']],
    [
      'temporary_failure',
      'FAILED',
      ['TEMPORARY_FAILURE', 'TEMPORARY_FAILURE', 'TEMPORARY_FAILURE'],
    ],
    ['permanent_failure', 'FAILED', ['PERMANENT_FAILURE']],
  ])(
    'processa o modo %s com resultado %s',
    async (mode, expectedStatus, expectedAttempts) => {
      process.env.SIMULATED_DELIVERY_MODE = mode;
      worker = await NestFactory.createApplicationContext(WorkerModule, {
        logger: false,
      });
      const response = await request(app.getHttpServer() as Server)
        .post('/api/notifications')
        .set('X-API-Key', apiKey)
        .send({
          templateId,
          recipient: 'simulado@example.com',
          data: { nome: 'Teste' },
        })
        .expect(202);
      const id = (response.body as { id: string }).id;
      notificationIds.push(id);
      let finished = false;
      for (let i = 0; i < 120; i++) {
        const notification = await prisma.notification.findUniqueOrThrow({
          where: { id },
        });
        if (notification.status === expectedStatus) {
          finished = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      expect(finished).toBe(true);
      const attempts = await prisma.deliveryAttempt.findMany({
        where: { notificationId: id },
        orderBy: { attemptNumber: 'asc' },
      });
      expect(attempts.map((attempt) => attempt.status)).toEqual(
        expectedAttempts,
      );
    },
  );
});
