import type { FutureLifecycleSeam } from './accountLifecycleDestination';

/**
 * Skip a gate that has no production source.
 * Season production uses the real Season session. Entitlement stays here until Sprint 4.
 * `unavailable` does not mean there is no current Season.
 */
export const UNAVAILABLE_LIFECYCLE_SEAM: FutureLifecycleSeam = {
  status: 'unavailable',
};
