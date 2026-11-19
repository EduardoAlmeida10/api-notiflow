import { Module } from '@nestjs/common';

import {
  TEMPLATE_REPOSITORY,
  type TemplateRepository,
} from '../application/ports/template.repository';

import { CREATE_TEMPLATE } from '../application/tokens/template.tokens';
import { CreateTemplate } from '../application/use-cases/create-template';

import { TemplateController } from '../adapters/inbound/http/template.controller';

import { AuthenticationModule } from './authentication.module';
import { PersistenceModule } from './persistence.module';

@Module({
  imports: [AuthenticationModule, PersistenceModule],
  controllers: [TemplateController],
  providers: [
    {
      provide: CREATE_TEMPLATE,
      useFactory: (templateRepository: TemplateRepository) =>
        new CreateTemplate(templateRepository),
      inject: [TEMPLATE_REPOSITORY],
    },
  ],
})
export class TemplateModule {}
