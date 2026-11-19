import type { Application } from '../../domain/application';

export interface CreateApplicationData {
  name: string;
  apiKeyHash: string;
}

export interface ApplicationRepository {
  create(data: CreateApplicationData): Promise<Application>;

  findById(id: string): Promise<Application | null>;

  findByApiKeyHash(apiKeyHash: string): Promise<Application | null>;
}

export const APPLICATION_REPOSITORY = Symbol('APPLICATION_REPOSITORY');
