import { createHash } from 'node:crypto';
import type { ContentPackage } from './types';

/**
 * Canonical JSON for fingerprinting:
 * - recursively sorted object keys
 * - arrays keep their already-stabilized order
 * - undefined fields are omitted
 *
 * Must never include timestamps, usernames, local paths, random UUIDs,
 * or execution metadata.
 */
export function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      const next = record[key];
      if (next !== undefined) {
        sorted[key] = sortKeysDeep(next);
      }
    }
    return sorted;
  }
  return value;
}

export function canonicalize(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value));
}

export function fingerprintContent(content: ContentPackage): string {
  return createHash('sha256').update(canonicalize(content), 'utf8').digest('hex');
}

export function stablePrettyJson(value: unknown): string {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}\n`;
}
