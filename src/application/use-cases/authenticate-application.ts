import type { Application } from '../../domain/application';
import type { ApiKeyHasher } from '../ports/api-key-hasher';
import type { ApplicationRepository } from '../ports/application.repository';

export class AuthenticateApplication {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly apiKeyHasher: ApiKeyHasher,
  ) {}

  async execute(apiKey: string): Promise<Application | null> {
    if (!/^nf_[a-f0-9]{64}$/.test(apiKey)) {
      return null;
    }

    const apiKeyHash = this.apiKeyHasher.hash(apiKey);

    const application =
      await this.applicationRepository.findByApiKeyHash(apiKeyHash);

    if (!application || !application.isActive) {
      return null;
    }

    return application;
  }
}
