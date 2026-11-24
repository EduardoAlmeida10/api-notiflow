import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  EXAMPLE_JOB,
  EXAMPLE_QUEUE,
} from '../../../infrastructure/config/redis.config';

@Processor(EXAMPLE_QUEUE)
export class ExampleProcessor extends WorkerHost {
  private readonly logger = new Logger(ExampleProcessor.name);

  async process(job: Job<{ message: string }>): Promise<void> {
    if (job.name !== EXAMPLE_JOB || typeof job.data?.message !== 'string') {
      throw new Error('Tarefa de exemplo inválida.');
    }

    this.logger.log(`Tarefa ${job.id} consumida: ${job.data.message}`);
    await Promise.resolve();
  }
}
