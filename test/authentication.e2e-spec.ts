import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Controller, Get, Module, UseGuards } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { ApiKeyGuard } from '../src/adapters/inbound/http/api-key.guard';
import { CurrentApplication } from '../src/adapters/inbound/http/decorators/current-application.decorator';
import { AuthenticationModule } from '../src/composition/authentication.module';
import type { Application } from '../src/domain/application';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

@Controller('auth-test')
@UseGuards(ApiKeyGuard)
class AuthenticationTestController {
  @Get()
  getAuthenticatedApplication(@CurrentApplication() application: Application) {
    return {
      id: application.id,
      name: application.name,
    };
  }
}

@Module({
  imports: [AuthenticationModule],
  controllers: [AuthenticationTestController],
})
class AuthenticationTestModule {}

describe('Autenticação por API Key (integração)', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  const applicationIds: string[] = [];

  function generateApiKey(): string {
    return `nf_${randomBytes(32).toString('hex')}`;
  }

  function hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey, 'utf8').digest('hex');
  }

  async function createApplication(isActive = true) {
    const apiKey = generateApiKey();

    const application = await prisma.application.create({
      data: {
        name: `Aplicação de teste ${randomUUID()}`,
        apiKeyHash: hashApiKey(apiKey),
        isActive,
      },
    });

    applicationIds.push(application.id);

    return { application, apiKey };
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        AuthenticationTestModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    try {
      if (prisma && applicationIds.length > 0) {
        await prisma.application.deleteMany({
          where: {
            id: { in: applicationIds },
          },
        });
      }
    } finally {
      if (app) {
        await app.close();
      } else {
        await moduleRef?.close();
      }
    }
  });

  it('autentica uma aplicação ativa com API Key válida', async () => {
    const { application, apiKey } = await createApplication();

    const response = await request(app.getHttpServer())
      .get('/auth-test')
      .set('X-API-Key', apiKey)
      .expect(200);

    expect(response.body).toEqual({
      id: application.id,
      name: application.name,
    });
  });

  it('rejeita requisições sem API Key', async () => {
    await request(app.getHttpServer()).get('/auth-test').expect(401);
  });

  it('rejeita uma API Key com formato inválido', async () => {
    await request(app.getHttpServer())
      .get('/auth-test')
      .set('X-API-Key', 'chave-invalida')
      .expect(401);
  });

  it('rejeita uma API Key inexistente', async () => {
    const apiKey = generateApiKey();

    await request(app.getHttpServer())
      .get('/auth-test')
      .set('X-API-Key', apiKey)
      .expect(401);
  });

  it('rejeita uma API Key de aplicação inativa', async () => {
    const { apiKey } = await createApplication(false);

    await request(app.getHttpServer())
      .get('/auth-test')
      .set('X-API-Key', apiKey)
      .expect(401);
  });

  it('disponibiliza a aplicação correta sem expor seu hash', async () => {
    const { application, apiKey } = await createApplication();

    const response = await request(app.getHttpServer())
      .get('/auth-test')
      .set('X-API-Key', apiKey)
      .expect(200);

    expect(response.body.id).toBe(application.id);
    expect(response.body.name).toBe(application.name);
    expect(response.body).not.toHaveProperty('apiKeyHash');
  });
});
