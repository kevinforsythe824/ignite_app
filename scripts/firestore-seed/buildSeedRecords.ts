import type { FirestoreCardDocument } from '../../src/features/flashcards/data/firestoreCardDocument';

/**
 * Temporary test seed derives card_number from fixture array order (v1 → 1).
 * Official future curriculum should provide validated official card numbers
 * rather than relying on array position.
 */
export const TEST_SEED_SEASON_ID = 'test-season';
export const TEST_SEED_TITLE = 'Luke 2:1-9';

export class SeedValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeedValidationError';
  }
}

export interface FirestoreCardSeedRecord {
  cardId: string;
  document: FirestoreCardDocument;
}

function requireNonEmptyString(value: unknown, field: string, index: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new SeedValidationError(`Fixture[${index}] ${field} must be a non-empty string`);
  }
  return value;
}

function requireMatchedRules(value: unknown, index: number): FirestoreCardDocument['matched_rules'] {
  if (!Array.isArray(value)) {
    throw new SeedValidationError(`Fixture[${index}] matched_rules must be an array`);
  }

  return value.map((rule, ruleIndex) => {
    if (rule === null || typeof rule !== 'object' || Array.isArray(rule)) {
      throw new SeedValidationError(
        `Fixture[${index}] matched_rules[${ruleIndex}] must be an object`,
      );
    }
    const row = rule as Record<string, unknown>;
    if (typeof row.notes !== 'string') {
      throw new SeedValidationError(
        `Fixture[${index}] matched_rules[${ruleIndex}].notes must be a string`,
      );
    }
    return {
      rule_name: requireNonEmptyString(
        row.rule_name,
        `matched_rules[${ruleIndex}].rule_name`,
        index,
      ),
      rule_category: requireNonEmptyString(
        row.rule_category,
        `matched_rules[${ruleIndex}].rule_category`,
        index,
      ),
      notes: row.notes,
    };
  });
}

function requireTags(value: unknown, index: number): string[] {
  if (!Array.isArray(value) || value.some((tag) => typeof tag !== 'string')) {
    throw new SeedValidationError(`Fixture[${index}] tags must be an array of strings`);
  }
  return [...(value as string[])];
}

/** Validates JSON fixtures and maps them to Firestore Card documents. */
export function buildFirestoreCardSeedRecords(fixtures: unknown): FirestoreCardSeedRecord[] {
  if (!Array.isArray(fixtures)) {
    throw new SeedValidationError('Fixture data must be an array');
  }
  if (fixtures.length === 0) {
    throw new SeedValidationError('Fixture data must contain at least one card');
  }

  const seenIds = new Set<string>();

  return fixtures.map((fixture, index) => {
    if (fixture === null || typeof fixture !== 'object' || Array.isArray(fixture)) {
      throw new SeedValidationError(`Fixture[${index}] must be an object`);
    }

    const row = fixture as Record<string, unknown>;
    const cardId = requireNonEmptyString(row.id, 'id', index);
    if (seenIds.has(cardId)) {
      throw new SeedValidationError(`Duplicate fixture id "${cardId}"`);
    }
    seenIds.add(cardId);

    const document: FirestoreCardDocument = {
      card_number: index + 1,
      reference: requireNonEmptyString(row.reference, 'reference', index),
      verse_text: requireNonEmptyString(row.verse_text, 'verse_text', index),
      index_code: requireNonEmptyString(row.index_code, 'index_code', index),
      matched_rules: requireMatchedRules(row.matched_rules, index),
      tags: requireTags(row.tags, index),
    };

    return { cardId, document };
  });
}
