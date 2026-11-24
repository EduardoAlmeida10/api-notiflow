import { Injectable } from '@nestjs/common';
import type {
  CreateNotificationData,
  NotificationRepository,
} from '../../../application/ports/notification.repository';
import { Notification, NotificationStatus } from '../../../domain/notification';
import type {
  Notification as PrismaNotification,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        applicationId: data.applicationId,
        templateId: data.templateId,
        recipient: data.recipient,
        data: data.data as Prisma.InputJsonObject,
        status: NotificationStatus.PENDING,
        idempotencyKey: data.idempotencyKey,
        payloadHash: data.payloadHash,
      },
    });

    return this.toDomain(notification);
  }

  async findById(
    id: string,
    applicationId: string,
  ): Promise<Notification | null> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id,
        applicationId,
      },
    });

    return notification ? this.toDomain(notification) : null;
  }

  async findByIdempotencyKey(
    applicationId: string,
    idempotencyKey: string,
  ): Promise<Notification | null> {
    const notification = await this.prisma.notification.findUnique({
      where: {
        applicationId_idempotencyKey: {
          applicationId,
          idempotencyKey,
        },
      },
    });

    return notification ? this.toDomain(notification) : null;
  }

  async claimPending(id: string): Promise<Notification | null> {
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.notification.updateMany({
        where: { id, status: NotificationStatus.PENDING },
        data: { status: NotificationStatus.PROCESSING },
      });
      if (claimed.count === 0) return null;
      const notification = await tx.notification.findUniqueOrThrow({
        where: { id },
      });
      return this.toDomain(notification);
    });
  }

  async updateStatus(
    id: string,
    status: NotificationStatus,
    sentAt?: Date | null,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.update({
      where: { id },
      data: {
        status,
        ...(sentAt !== undefined ? { sentAt } : {}),
      },
    });

    return this.toDomain(notification);
  }

  private toDomain(notification: PrismaNotification): Notification {
    return new Notification(
      notification.id,
      notification.applicationId,
      notification.templateId,
      notification.recipient,
      notification.data as Record<string, unknown>,
      notification.status as NotificationStatus,
      notification.idempotencyKey,
      notification.payloadHash,
      notification.createdAt,
      notification.updatedAt,
      notification.sentAt,
    );
  }
}
