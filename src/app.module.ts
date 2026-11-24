import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './adapters/inbound/http/health.controller';
import { PersistenceModule } from './composition/persistence.module';
import { AuthenticationModule } from './composition/authentication.module';
import { TemplateModule } from './composition/template.module';
import { NotificationModule } from './composition/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PersistenceModule,
    AuthenticationModule,
    TemplateModule,
    NotificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
