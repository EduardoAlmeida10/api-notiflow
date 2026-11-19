import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './adapters/inbound/http/health.controller';
import { PersistenceModule } from './composition/persistence.module';
import { AuthenticationModule } from './composition/authentication.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PersistenceModule,
    AuthenticationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
