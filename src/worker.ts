import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './composition/worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  new Logger('Worker').log('Worker iniciado e aguardando tarefas.');
}

bootstrap().catch((error: unknown) => {
  new Logger('Worker').error(
    'Não foi possível iniciar o worker.',
    error instanceof Error ? error.stack : String(error),
  );
  process.exitCode = 1;
});
