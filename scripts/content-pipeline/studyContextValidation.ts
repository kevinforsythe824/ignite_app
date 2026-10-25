import { issue } from './errors';
import type { ValidationIssue } from './types';

const STUDY_CONTEXT_FIELDS = new Set(['battlefield', 'topic', 'thematicQuestion']);

export interface StudyContextLocation {
  workbook?: string;
  sheet?: string;
  row?: number;
  cardId?: string;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function located(
  partial: {
    code: string;
    reason: string;
    field: string;
  },
  location: StudyContextLocation,
): ValidationIssue {
  const reason = location.cardId ? `Card "${location.cardId}" ${partial.reason}` : partial.reason;
  return issue({
    code: partial.code,
    reason,
    workbook: location.workbook,
    sheet: location.sheet,
    row: location.row,
    field: partial.field,
  });
}

/**
 * Runtime shape check for optional studyContext.
 * Blank sponsor cells are omitted before this runs. Empty strings, null,
 * arrays, and non-finite numbers are invalid. Numbers are not coerced to text.
 */
export function studyContextIssues(
  value: unknown,
  location: StudyContextLocation = {},
): ValidationIssue[] {
  if (value === undefined) {
    return [];
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value) || !isPlainObject(value)) {
    return [
      located(
        {
          code: 'invalid_study_context',
          field: 'studyContext',
          reason: 'studyContext must be an object when provided.',
        },
        location,
      ),
    ];
  }

  const record = value as Record<string, unknown>;
  const errors: ValidationIssue[] = [];
  for (const key of Object.keys(record)) {
    if (!STUDY_CONTEXT_FIELDS.has(key)) {
      errors.push(
        located(
          {
            code: 'invalid_study_context',
            field: `studyContext.${key}`,
            reason: `studyContext field "${key}" is not allowed.`,
          },
          location,
        ),
      );
    }
  }

  if (Object.prototype.hasOwnProperty.call(record, 'battlefield') && record.battlefield !== undefined) {
    const battlefield = record.battlefield;
    const validNumber = typeof battlefield === 'number' && Number.isFinite(battlefield);
    const validString = typeof battlefield === 'string' && battlefield.length > 0;
    if (!validNumber && !validString) {
      errors.push(
        located(
          {
            code: 'invalid_study_context',
            field: 'studyContext.battlefield',
            reason:
              'Battlefield must be a non-empty string or a finite number. A blank cell is omitted, not stored as 0 or an empty string.',
          },
          location,
        ),
      );
    }
  }

  for (const field of ['topic', 'thematicQuestion'] as const) {
    if (!Object.prototype.hasOwnProperty.call(record, field) || record[field] === undefined) {
      continue;
    }
    const text = record[field];
    if (typeof text !== 'string' || text.length === 0) {
      errors.push(
        located(
          {
            code: 'invalid_study_context',
            field: `studyContext.${field}`,
            reason: `${field} must be a non-empty string when provided. A blank cell is omitted.`,
          },
          location,
        ),
      );
    }
  }

  return errors;
}
