import type { Card, CardMatchedRule } from '../domain/card';
import type { FirestoreMatchedRule } from './firestoreCardDocument';

/** Thrown when Firestore curriculum data cannot become a valid Card. */
export class InvalidCurriculumDocumentError extends Error {
  readonly seasonId: string | undefined;
  readonly cardId: string | undefined;
  readonly field: string;

  constructor(field: string, reason: string, seasonId?: string, cardId?: string) {
    const location =
      seasonId !== undefined || cardId !== undefined
        ? ` (season "${seasonId ?? '?'}", card "${cardId ?? '?'}")`
        : '';
    super(`Invalid curriculum document${location}: ${field} ${reason}`);
    this.name = 'InvalidCurriculumDocumentError';
    this.field = field;
    this.seasonId = seasonId;
    this.cardId = cardId;
  }
}

function fail(
  field: string,
  reason: string,
  seasonId?: string,
  cardId?: string,
): never {
  throw new InvalidCurriculumDocumentError(field, reason, seasonId, cardId);
}

function requireNonEmptyString(
  value: unknown,
  field: string,
  seasonId?: string,
  cardId?: string,
): string {
  if (typeof value !== 'string') {
    fail(field, 'must be a string', seasonId, cardId);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    fail(field, 'must be a non-empty string', seasonId, cardId);
  }
  return trimmed;
}

function requireCardNumber(
  value: unknown,
  seasonId: string,
  cardId: string,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    fail('card_number', 'must be a positive integer', seasonId, cardId);
  }
  return value;
}

function requireStringArray(
  value: unknown,
  field: string,
  seasonId: string,
  cardId: string,
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    fail(field, 'must be an array of strings', seasonId, cardId);
  }
  return [...value];
}

function requireMatchedRule(
  value: unknown,
  seasonId: string,
  cardId: string,
): CardMatchedRule {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('matched_rules', 'contains a malformed rule', seasonId, cardId);
  }

  const rule = value as Partial<FirestoreMatchedRule>;
  if (typeof rule.notes !== 'string') {
    fail('matched_rules.notes', 'must be a string', seasonId, cardId);
  }

  return {
    ruleName: requireNonEmptyString(
      rule.rule_name,
      'matched_rules.rule_name',
      seasonId,
      cardId,
    ),
    ruleCategory: requireNonEmptyString(
      rule.rule_category,
      'matched_rules.rule_category',
      seasonId,
      cardId,
    ),
    notes: rule.notes,
  };
}

/**
 * Maps one Firestore Card document plus path identity to the domain Card.
 * `cardNumber` comes from the document, not from query order.
 */
export function mapFirestoreCardToDomain(
  document: unknown,
  seasonId: string,
  cardId: string,
): Card {
  const resolvedSeasonId = requireNonEmptyString(seasonId, 'seasonId');
  const resolvedCardId = requireNonEmptyString(cardId, 'cardId', resolvedSeasonId);

  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    fail('document', 'must be an object', resolvedSeasonId, resolvedCardId);
  }

  const data = document as Record<string, unknown>;
  if (!Array.isArray(data.matched_rules)) {
    fail('matched_rules', 'must be an array', resolvedSeasonId, resolvedCardId);
  }

  return {
    seasonId: resolvedSeasonId,
    cardId: resolvedCardId,
    cardNumber: requireCardNumber(data.card_number, resolvedSeasonId, resolvedCardId),
    reference: requireNonEmptyString(
      data.reference,
      'reference',
      resolvedSeasonId,
      resolvedCardId,
    ),
    verseText: requireNonEmptyString(
      data.verse_text,
      'verse_text',
      resolvedSeasonId,
      resolvedCardId,
    ),
    indexCode: requireNonEmptyString(
      data.index_code,
      'index_code',
      resolvedSeasonId,
      resolvedCardId,
    ),
    matchedRules: data.matched_rules.map((rule) =>
      requireMatchedRule(rule, resolvedSeasonId, resolvedCardId),
    ),
    tags: requireStringArray(data.tags, 'tags', resolvedSeasonId, resolvedCardId),
  };
}

export interface FirestoreCardSnapshot {
  cardId: string;
  data: unknown;
}

/** Maps snapshots in the given order; does not sort by cardNumber. */
export function mapFirestoreCardsToDomain(
  snapshots: readonly FirestoreCardSnapshot[],
  seasonId: string,
): Card[] {
  return snapshots.map((snapshot) =>
    mapFirestoreCardToDomain(snapshot.data, seasonId, snapshot.cardId),
  );
}
