import { Injectable } from '@nestjs/common';
import type {
  CreateDeliveryAttemptData,
  DeliveryAttemptRepository,
} from '../../../application/ports/delivery-attempt.repository';
import {
  DeliveryAttempt,
  DeliveryAttemptStatus,
} from '../../../domain/delivery-attempt';
import type { DeliveryAttempt as PrismaDeliveryAttempt } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaDeliveryAttemptRepository implements DeliveryAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDeliveryAttemptData): Promise<DeliveryAttempt> {
    const attempt = await this.prisma.deliveryAttempt.create({
      data: {
        notificationId: data.notificationId,
        attemptNumber: data.attemptNumber,
        status: data.status,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
      },
    });

    return this.toDomain(attempt);
  }

  async findByNotificationId(
    notificationId: string,
    applicationId: string,
  ): Promise<DeliveryAttempt[]> {
    const attempts = await this.prisma.deliveryAttempt.findMany({
      where: {
        notificationId,
        notification: {
          applicationId,
        },
      },
      orderBy: {
        attemptNumber: 'asc',
      },
    });

    return attempts.map((attempt) => this.toDomain(attempt));
  }

  private toDomain(attempt: PrismaDeliveryAttempt): DeliveryAttempt {
    return new DeliveryAttempt(
      attempt.id,
      attempt.notificationId,
      attempt.attemptNumber,
      attempt.status as DeliveryAttemptStatus,
      attempt.errorCode,
      attempt.errorMessage,
      attempt.attemptedAt,
    );
  }
}
