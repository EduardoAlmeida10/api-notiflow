export interface ApiKeyHasher {
  hash(apiKey: string): string;
}

export const API_KEY_HASHER = Symbol('API_KEY_HASHER');
