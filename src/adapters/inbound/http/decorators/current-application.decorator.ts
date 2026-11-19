import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import type { Application } from '../../../../domain/application';
import type { AuthenticatedRequest } from '../api-key.guard';

export const CurrentApplication = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Application => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const application = request.application;

    if (!application) {
      throw new UnauthorizedException('Aplicação não autenticada');
    }

    return application;
  },
);
