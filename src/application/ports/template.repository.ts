import type { Template } from '../../domain/template';

export interface CreateTemplateData {
  applicationId: string;
  name: string;
  subject: string;
  body: string;
}

export interface TemplateRepository {
  create(data: CreateTemplateData): Promise<Template>;

  findById(id: string, applicationId: string): Promise<Template | null>;

  findByName(name: string, applicationId: string): Promise<Template | null>;
}

export const TEMPLATE_REPOSITORY = Symbol('TEMPLATE_REPOSITORY');
