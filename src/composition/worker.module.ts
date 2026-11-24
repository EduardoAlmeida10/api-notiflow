import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  EXAMPLE_QUEUE,
  redisConnection,
} from '../infrastructure/config/redis.config';
import { ExampleProcessor } from '../adapters/inbound/queue/example.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config),
      }),
    }),
    BullModule.registerQueue({ name: EXAMPLE_QUEUE }),
  ],
  providers: [ExampleProcessor],
})
export class WorkerModule {}
