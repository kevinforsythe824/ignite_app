import { isFrequencyTier } from '../../src/features/flashcards/domain/card';
import { OFFICIAL_CONTENT_SCHEMA_VERSION } from './constants';
import { issue } from './errors';
import type { ValidationIssue } from './types';

export interface FrequencyTierLocation {
  workbook?: string;
  sheet?: string;
  row?: number;
  cardId?: string;
}

function located(
  partial: { code: string; reason: string },
  location: FrequencyTierLocation,
): ValidationIssue {
  const reason = location.cardId ? `Card "${location.cardId}" ${partial.reason}` : partial.reason;
  return issue({
    code: partial.code,
    reason,
    workbook: location.workbook,
    sheet: location.sheet,
    row: location.row,
    field: 'frequencyTier',
  });
}

function readTier(annotation: object): { present: boolean; value: unknown } {
  if (!Object.prototype.hasOwnProperty.call(annotation, 'frequencyTier')) {
    return { present: false, value: undefined };
  }
  const value = (annotation as { frequencyTier?: unknown }).frequencyTier;
  if (value === undefined) {
    return { present: false, value: undefined };
  }
  return { present: true, value };
}

/**
 * Schema 1.1.0 frequency annotations require frequencyTier 1–5.
 * Schema 1.0.0 frequency annotations may omit it.
 * Any other annotation type fails if a tier is present.
 */
export function frequencyTierIssues(
  annotation: object & { type?: string },
  schemaVersion: string,
  location: FrequencyTierLocation = {},
): ValidationIssue[] {
  const tier = readTier(annotation);
  const type = annotation.type;
  if (type !== 'frequency') {
    if (!tier.present) {
      return [];
    }
    return [
      located(
        {
          code: 'unexpected_frequency_tier',
          reason: 'frequencyTier is only valid on frequency annotations.',
        },
        location,
      ),
    ];
  }

  if (!tier.present) {
    if (schemaVersion !== OFFICIAL_CONTENT_SCHEMA_VERSION) {
      return [];
    }
    return [
      located(
        {
          code: 'missing_frequency_tier',
          reason: `Frequency annotations in schema ${OFFICIAL_CONTENT_SCHEMA_VERSION} require frequencyTier 1, 2, 3, 4, or 5.`,
        },
        location,
      ),
    ];
  }

  if (!isFrequencyTier(tier.value)) {
    return [
      located(
        {
          code: 'invalid_frequency_tier',
          reason: 'frequencyTier must be an integer from 1 through 5.',
        },
        location,
      ),
    ];
  }

  return [];
}
