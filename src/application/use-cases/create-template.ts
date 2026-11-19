import type { Template } from '../../domain/template';
import type { TemplateRepository } from '../ports/template.repository';

export interface CreateTemplateInput {
  applicationId: string;
  name: string;
  subject: string;
  body: string;
}

export class TemplateAlreadyExistsError extends Error {
  constructor() {
    super('Já existe um template com esse nome nesta aplicação');
    this.name = 'TemplateAlreadyExistsError';
  }
}

export class CreateTemplate {
  constructor(private readonly templateRepository: TemplateRepository) {}

  async execute(input: CreateTemplateInput): Promise<Template> {
    const existingTemplate = await this.templateRepository.findByName(
      input.name,
      input.applicationId,
    );

    if (existingTemplate) {
      throw new TemplateAlreadyExistsError();
    }

    return this.templateRepository.create({
      applicationId: input.applicationId,
      name: input.name,
      subject: input.subject,
      body: input.body,
    });
  }
}
