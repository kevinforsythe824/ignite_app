import type { FutureLifecycleSeam } from './accountLifecycleDestination';

/**
 * Production Phase 7 seam. Sprint 3 (season) and Sprint 4 (entitlement)
 * replace this constant with a real resolver later. Skip the gate.
 */
export const UNAVAILABLE_LIFECYCLE_SEAM: FutureLifecycleSeam = {
  status: 'unavailable',
};
