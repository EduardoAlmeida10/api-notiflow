import { randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

import {
  TEMPLATE_REPOSITORY,
  type TemplateRepository,
} from '../src/application/ports/template.repository';

import { PersistenceModule } from '../src/composition/persistence.module';
import { Template } from '../src/domain/template';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('TemplateRepository (integração)', () => {
  let moduleRef: TestingModule;
  let repository: TemplateRepository;
  let prisma: PrismaService;

  const applicationIds: string[] = [];

  async function createApplication() {
    const application = await prisma.application.create({
      data: {
        name: 'Aplicação de teste',
        apiKeyHash: `teste-${randomUUID()}`,
      },
    });

    applicationIds.push(application.id);

    return application;
  }

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        PersistenceModule,
      ],
    }).compile();

    repository = moduleRef.get<TemplateRepository>(TEMPLATE_REPOSITORY);

    prisma = moduleRef.get(PrismaService);

    await moduleRef.init();
  });

  afterAll(async () => {
    try {
      if (prisma && applicationIds.length > 0) {
        await prisma.$transaction(async (tx) => {
          await tx.template.deleteMany({
            where: {
              applicationId: {
                in: applicationIds,
              },
            },
          });

          await tx.application.deleteMany({
            where: {
              id: {
                in: applicationIds,
              },
            },
          });
        });
      }
    } finally {
      await moduleRef?.close();
    }
  });

  it('persiste e consulta um template por ID e nome', async () => {
    const application = await createApplication();

    const data = {
      applicationId: application.id,
      name: 'boas_vindas',
      subject: 'Bem-vindo!',
      body: 'Olá, {{nome}}!',
    };

    const created = await repository.create(data);

    const persisted = await prisma.template.findUnique({
      where: { id: created.id },
    });

    expect(persisted).toMatchObject(data);

    const foundById = await repository.findById(created.id, application.id);

    const foundByName = await repository.findByName(data.name, application.id);

    expect(created).toBeInstanceOf(Template);
    expect(created.createdAt).toBeInstanceOf(Date);

    expect(foundById).toEqual(created);
    expect(foundByName).toEqual(created);
  });

  it('impede uma aplicação de consultar templates de outra', async () => {
    const applicationA = await createApplication();
    const applicationB = await createApplication();

    const template = await repository.create({
      applicationId: applicationA.id,
      name: 'pedido_confirmado',
      subject: 'Pedido confirmado',
      body: 'Seu pedido foi confirmado.',
    });

    const foundById = await repository.findById(template.id, applicationB.id);

    const foundByName = await repository.findByName(
      template.name,
      applicationB.id,
    );

    expect(foundById).toBeNull();
    expect(foundByName).toBeNull();
  });

  it('impede nomes duplicados na mesma aplicação', async () => {
    const application = await createApplication();

    const data = {
      applicationId: application.id,
      name: 'notificacao_teste',
      subject: 'Assunto',
      body: 'Mensagem',
    };

    await repository.create(data);

    await expect(repository.create(data)).rejects.toMatchObject({
      code: 'P2002',
    });

    const count = await prisma.template.count({
      where: {
        applicationId: application.id,
        name: data.name,
      },
    });

    expect(count).toBe(1);
  });

  it('permite o mesmo nome em aplicações diferentes', async () => {
    const applicationA = await createApplication();
    const applicationB = await createApplication();

    const data = {
      name: 'aviso',
      subject: 'Aviso',
      body: 'Mensagem de aviso.',
    };

    const templateA = await repository.create({
      ...data,
      applicationId: applicationA.id,
    });

    const templateB = await repository.create({
      ...data,
      applicationId: applicationB.id,
    });

    expect(templateA.id).not.toBe(templateB.id);
    expect(templateA.applicationId).toBe(applicationA.id);
    expect(templateB.applicationId).toBe(applicationB.id);
  });
});
