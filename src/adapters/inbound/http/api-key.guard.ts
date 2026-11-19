import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import { Application } from '../../../domain/application';
import { AUTHENTICATE_APPLICATION } from '../../../application/tokens/authentication.tokens';
import { AuthenticateApplication } from '../../../application/use-cases/authenticate-application';

export interface AuthenticatedRequest extends Request {
  application?: Application;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @Inject(AUTHENTICATE_APPLICATION)
    private readonly authenticateApplication: AuthenticateApplication,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const apiKey = request.header('x-api-key');

    if (!apiKey) {
      throw new UnauthorizedException('API Key não informada');
    }

    const application = await this.authenticateApplication.execute(apiKey);

    if (!application) {
      throw new UnauthorizedException('API Key inválida');
    }

    request.application = application;

    return true;
  }
}
