import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';

import { ApiKeyGuard } from './api-key.guard';
import { CurrentApplication } from './decorators/current-application.decorator';
import { CreateTemplateDto } from './dto/create-template.dto';

import type { Application } from '../../../domain/application';

import { CREATE_TEMPLATE } from '../../../application/tokens/template.tokens';

import {
  CreateTemplate,
  TemplateAlreadyExistsError,
} from '../../../application/use-cases/create-template';

@Controller('templates')
@UseGuards(ApiKeyGuard)
export class TemplateController {
  constructor(
    @Inject(CREATE_TEMPLATE)
    private readonly createTemplate: CreateTemplate,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    dto: CreateTemplateDto,
    @CurrentApplication() application: Application,
  ) {
    try {
      const template = await this.createTemplate.execute({
        applicationId: application.id,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
      });

      return {
        id: template.id,
        name: template.name,
        subject: template.subject,
        body: template.body,
        createdAt: template.createdAt,
      };
    } catch (error) {
      if (error instanceof TemplateAlreadyExistsError) {
        throw new ConflictException(error.message);
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Já existe um template com esse nome nesta aplicação',
        );
      }

      throw error;
    }
  }
}
