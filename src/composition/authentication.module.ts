import { Module } from '@nestjs/common';

import {
  APPLICATION_REPOSITORY,
  type ApplicationRepository,
} from '../application/ports/application.repository';

import {
  API_KEY_HASHER,
  type ApiKeyHasher,
} from '../application/ports/api-key-hasher';

import { AUTHENTICATE_APPLICATION } from '../application/tokens/authentication.tokens';
import { AuthenticateApplication } from '../application/use-cases/authenticate-application';

import { Sha256ApiKeyHasher } from '../adapters/outbound/crypto/sha256-api-key-hasher';
import { ApiKeyGuard } from '../adapters/inbound/http/api-key.guard';

import { PersistenceModule } from './persistence.module';

@Module({
  imports: [PersistenceModule],
  providers: [
    {
      provide: API_KEY_HASHER,
      useClass: Sha256ApiKeyHasher,
    },
    {
      provide: AUTHENTICATE_APPLICATION,
      useFactory: (
        applicationRepository: ApplicationRepository,
        apiKeyHasher: ApiKeyHasher,
      ) => new AuthenticateApplication(applicationRepository, apiKeyHasher),
      inject: [APPLICATION_REPOSITORY, API_KEY_HASHER],
    },
    ApiKeyGuard,
  ],
  exports: [ApiKeyGuard, AUTHENTICATE_APPLICATION],
})
export class AuthenticationModule {}
