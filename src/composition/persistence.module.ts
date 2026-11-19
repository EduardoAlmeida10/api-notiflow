import { Module } from '@nestjs/common';
import { APPLICATION_REPOSITORY } from '../application/ports/application.repository';
import { PrismaApplicationRepository } from '../adapters/outbound/persistence/prisma-application.repository';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: APPLICATION_REPOSITORY,
      useClass: PrismaApplicationRepository,
    },
  ],
  exports: [APPLICATION_REPOSITORY],
})
export class PersistenceModule {}
