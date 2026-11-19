import { Injectable } from '@nestjs/common';
import type {
  ApplicationRepository,
  CreateApplicationData,
} from '../../../application/ports/application.repository';
import { Application } from '../../../domain/application';
import type { Application as PrismaApplication } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaApplicationRepository implements ApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateApplicationData): Promise<Application> {
    const application = await this.prisma.application.create({
      data: {
        name: data.name,
        apiKeyHash: data.apiKeyHash,
      },
    });

    return this.toDomain(application);
  }

  async findById(id: string): Promise<Application | null> {
    const application = await this.prisma.application.findUnique({
      where: { id },
    });

    return application ? this.toDomain(application) : null;
  }

  async findByApiKeyHash(apiKeyHash: string): Promise<Application | null> {
    const application = await this.prisma.application.findUnique({
      where: { apiKeyHash },
    });

    return application ? this.toDomain(application) : null;
  }

  private toDomain(application: PrismaApplication): Application {
    return new Application(
      application.id,
      application.name,
      application.apiKeyHash,
      application.isActive,
      application.createdAt,
      application.updatedAt,
    );
  }
}
