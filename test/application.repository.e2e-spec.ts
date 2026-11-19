import { randomUUID } from 'node:crypto';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { APPLICATION_REPOSITORY } from '../src/application/ports/application.repository';
import type { ApplicationRepository } from '../src/application/ports/application.repository';
import { PersistenceModule } from '../src/composition/persistence.module';
import { Application } from '../src/domain/application';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';

describe('ApplicationRepository (integração)', () => {
  let moduleRef: TestingModule;
  let repository: ApplicationRepository;
  let prisma: PrismaService;

  const testHashes: string[] = [];

  function createTestData() {
    const apiKeyHash = `teste-${randomUUID()}`;
    testHashes.push(apiKeyHash);

    return {
      name: 'Aplicação de teste',
      apiKeyHash,
    };
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

    repository = moduleRef.get<ApplicationRepository>(APPLICATION_REPOSITORY);
    prisma = moduleRef.get(PrismaService);

    await moduleRef.init();
  });

  afterAll(async () => {
    try {
      if (prisma && testHashes.length > 0) {
        await prisma.application.deleteMany({
          where: {
            apiKeyHash: {
              in: testHashes,
            },
          },
        });
      }
    } finally {
      await moduleRef?.close();
    }
  });

  it('persiste uma aplicação e permite consultá-la por ID e hash', async () => {
    const data = createTestData();

    const created = await repository.create(data);

    // Confirma a gravação diretamente no banco.
    const persisted = await prisma.application.findUnique({
      where: { id: created.id },
    });

    expect(persisted).toMatchObject({
      id: created.id,
      name: data.name,
      apiKeyHash: data.apiKeyHash,
      isActive: true,
    });

    const foundById = await repository.findById(created.id);
    const foundByHash = await repository.findByApiKeyHash(data.apiKeyHash);

    expect(created).toBeInstanceOf(Application);
    expect(created.createdAt).toBeInstanceOf(Date);
    expect(created.updatedAt).toBeInstanceOf(Date);

    expect(foundById).toBeInstanceOf(Application);
    expect(foundById).toEqual(created);
    expect(foundByHash).toBeInstanceOf(Application);
    expect(foundByHash).toEqual(created);
  });

  it('retorna null quando a aplicação não existe', async () => {
    const foundById = await repository.findById(randomUUID());
    const foundByHash = await repository.findByApiKeyHash(
      `inexistente-${randomUUID()}`,
    );

    expect(foundById).toBeNull();
    expect(foundByHash).toBeNull();
  });

  it('impede aplicações com o mesmo hash de chave', async () => {
    const data = createTestData();

    await repository.create(data);

    await expect(repository.create(data)).rejects.toMatchObject({
      code: 'P2002',
    });

    const count = await prisma.application.count({
      where: { apiKeyHash: data.apiKeyHash },
    });

    expect(count).toBe(1);
  });
});
