import { createHash } from 'node:crypto';

import type { ApiKeyHasher } from '../../../application/ports/api-key-hasher';

export class Sha256ApiKeyHasher implements ApiKeyHasher {
  hash(apiKey: string): string {
    return createHash('sha256').update(apiKey, 'utf8').digest('hex');
  }
}
