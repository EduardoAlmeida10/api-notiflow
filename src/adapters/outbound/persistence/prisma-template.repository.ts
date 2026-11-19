import { Injectable } from '@nestjs/common';
import type {
  CreateTemplateData,
  TemplateRepository,
} from '../../../application/ports/template.repository';
import { Template } from '../../../domain/template';
import type { Template as PrismaTemplate } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaTemplateRepository implements TemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTemplateData): Promise<Template> {
    const template = await this.prisma.template.create({
      data: {
        applicationId: data.applicationId,
        name: data.name,
        subject: data.subject,
        body: data.body,
      },
    });

    return this.toDomain(template);
  }

  async findById(id: string, applicationId: string): Promise<Template | null> {
    const template = await this.prisma.template.findFirst({
      where: {
        id,
        applicationId,
      },
    });

    return template ? this.toDomain(template) : null;
  }

  async findByName(
    name: string,
    applicationId: string,
  ): Promise<Template | null> {
    const template = await this.prisma.template.findUnique({
      where: {
        applicationId_name: {
          applicationId,
          name,
        },
      },
    });

    return template ? this.toDomain(template) : null;
  }

  private toDomain(template: PrismaTemplate): Template {
    return new Template(
      template.id,
      template.applicationId,
      template.name,
      template.subject,
      template.body,
      template.createdAt,
      template.updatedAt,
    );
  }
}
