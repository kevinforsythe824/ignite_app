import { notConnected } from '../errors';
import { aiGateway, type AiGateway } from './aiGateway';

/**
 * Remote API facade for non-Firebase HTTP (health, config, AI proxy).
 */
export interface ApiService {
  readonly ai: AiGateway;
  /** Lightweight reachability check once a gateway exists. */
  healthCheck(): Promise<{ ok: boolean; version: string | null }>;
}

/** Stub API service — no network clients yet. */
export const apiService: ApiService = {
  ai: aiGateway,
  healthCheck: () => notConnected('api', 'healthCheck'),
};

export function createApiService(): ApiService {
  return apiService;
}
