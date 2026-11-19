import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  ServiceUnavailableException,
  NotFoundException,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';

import { ApiKeyGuard } from './api-key.guard';
import { CurrentApplication } from './decorators/current-application.decorator';
import { RequestNotificationDto } from './dto/request-notification.dto';

import type { Application } from '../../../domain/application';

import { REQUEST_NOTIFICATION } from '../../../application/tokens/notification.tokens';
import { RequestNotification } from '../../../application/use-cases/request-notification';

import {
  NotificationEnqueueError,
  TemplateNotFoundError,
} from '../../../application/errors/notification.errors';

@Controller('notifications')
@UseGuards(ApiKeyGuard)
export class NotificationController {
  constructor(
    @Inject(REQUEST_NOTIFICATION)
    private readonly requestNotification: RequestNotification,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async create(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    dto: RequestNotificationDto,
    @CurrentApplication() application: Application,
  ) {
    try {
      const notification = await this.requestNotification.execute({
        applicationId: application.id,
        templateId: dto.templateId,
        recipient: dto.recipient,
        data: dto.data,
      });

      return {
        id: notification.id,
        status: notification.status,
        createdAt: notification.createdAt,
      };
    } catch (error) {
      if (error instanceof TemplateNotFoundError) {
        throw new NotFoundException(error.message);
      }

      if (error instanceof NotificationEnqueueError) {
        throw new ServiceUnavailableException(error.message);
      }

      throw error;
    }
  }
}
