import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import {
  EXAMPLE_JOB,
  EXAMPLE_QUEUE,
  redisConnection,
} from '../config/redis.config';

async function main() {
  const queue = new Queue(EXAMPLE_QUEUE, {
    connection: {
      ...redisConnection(new ConfigService()),
      maxRetriesPerRequest: 1,
    },
  });
  try {
    const job = await queue.add(EXAMPLE_JOB, { message: 'Olá do Notiflow!' });
    console.log(`Tarefa de exemplo ${job.id} enfileirada.`);
  } finally {
    await queue.close();
  }
}

main().catch((error: unknown) => {
  console.error('Não foi possível enfileirar a tarefa de exemplo:', error);
  process.exitCode = 1;
});
