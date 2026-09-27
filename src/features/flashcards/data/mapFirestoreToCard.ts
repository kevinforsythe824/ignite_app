import {
  PHRASE_OCCURRENCE_STRATEGY,
  type Card,
  type CardAnnotation,
  type CardAnnotationSourceTarget,
  type CardCrossReference,
  type CardQuizMetadata,
} from '../domain/card';

/** Thrown when Firestore curriculum data cannot become a valid domain value. */
export class InvalidCurriculumDocumentError extends Error {
  readonly seasonId: string | undefined;
  readonly cardId: string | undefined;
  readonly field: string;

  constructor(
    field: string,
    reason: string,
    seasonId?: string,
    documentId?: string,
    documentKind: 'card' | 'section' | 'materialSet' = 'card',
  ) {
    const location =
      seasonId !== undefined || documentId !== undefined
        ? ` (season "${seasonId ?? '?'}", ${documentKind} "${documentId ?? '?'}")`
        : '';
    super(`Invalid curriculum document${location}: ${field} ${reason}`);
    this.name = 'InvalidCurriculumDocumentError';
    this.field = field;
    this.seasonId = seasonId;
    this.cardId = documentKind === 'card' ? documentId : undefined;
  }
}

export function throwInvalidCurriculumDocument(
  field: string,
  reason: string,
  seasonId?: string,
  documentId?: string,
  documentKind: 'card' | 'section' | 'materialSet' = 'card',
): never {
  throw new InvalidCurriculumDocumentError(
    field,
    reason,
    seasonId,
    documentId,
    documentKind,
  );
}

function fail(
  field: string,
  reason: string,
  seasonId?: string,
  cardId?: string,
): never {
  throwInvalidCurriculumDocument(field, reason, seasonId, cardId, 'card');
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

function requireExactIdentity(
  value: unknown,
  expected: string,
  field: string,
  seasonId: string,
  cardId: string,
): void {
  if (typeof value !== 'string' || value.length === 0) {
    fail(field, 'must be a non-empty string', seasonId, cardId);
  }
  if (value !== expected) {
    fail(field, `must equal "${expected}"`, seasonId, cardId);
  }
}

function requirePreservedText(
  value: unknown,
  field: string,
  seasonId: string,
  cardId: string,
): string {
  if (typeof value !== 'string') {
    fail(field, 'must be a string', seasonId, cardId);
  }
  if (value.trim().length === 0) {
    fail(field, 'must be a non-empty string', seasonId, cardId);
  }
  return value;
}

function requireCardNumber(value: unknown, seasonId: string, cardId: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    fail('cardNumber', 'must be a positive integer', seasonId, cardId);
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

function requireOccurrenceIndex(
  value: unknown,
  seasonId: string,
  cardId: string,
): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    fail(
      'annotations.sourceTarget.occurrenceIndex',
      'must be an integer greater than or equal to 1',
      seasonId,
      cardId,
    );
  }
  return value;
}

function requirePhrase(value: unknown, seasonId: string, cardId: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    fail(
      'annotations.sourceTarget.phrase',
      'must be a non-empty string',
      seasonId,
      cardId,
    );
  }
  return value;
}

function requireSpan(
  value: unknown,
  seasonId: string,
  cardId: string,
): { start: number; end: number } {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('annotations.resolvedTarget', 'must be an object', seasonId, cardId);
  }
  const span = value as { start?: unknown; end?: unknown };
  if (typeof span.start !== 'number' || !Number.isInteger(span.start) || span.start < 0) {
    fail('annotations.resolvedTarget', 'has a bad span', seasonId, cardId);
  }
  if (
    typeof span.end !== 'number' ||
    !Number.isInteger(span.end) ||
    span.end <= span.start
  ) {
    fail('annotations.resolvedTarget', 'has a bad span', seasonId, cardId);
  }
  return { start: span.start, end: span.end };
}

function mapSourceTarget(
  value: unknown,
  seasonId: string,
  cardId: string,
): CardAnnotationSourceTarget {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('annotations.sourceTarget', 'must be an object', seasonId, cardId);
  }
  const source = value as { strategy?: unknown; phrase?: unknown; occurrenceIndex?: unknown };
  const strategy = requireNonEmptyString(
    source.strategy,
    'annotations.sourceTarget.strategy',
    seasonId,
    cardId,
  );
  if (strategy === PHRASE_OCCURRENCE_STRATEGY) {
    return {
      strategy,
      phrase: requirePhrase(source.phrase, seasonId, cardId),
      occurrenceIndex: requireOccurrenceIndex(source.occurrenceIndex, seasonId, cardId),
    };
  }
  return { strategy };
}

function mapAnnotation(
  value: unknown,
  seasonId: string,
  cardId: string,
): CardAnnotation {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('annotations', 'contains a malformed annotation', seasonId, cardId);
  }
  const raw = value as Record<string, unknown>;
  if (!('annotationId' in raw) || raw.annotationId === undefined) {
    fail('annotations.annotationId', 'must be a non-empty string', seasonId, cardId);
  }
  const annotationId = requireNonEmptyString(
    raw.annotationId,
    'annotations.annotationId',
    seasonId,
    cardId,
  );
  if (typeof raw.type !== 'string') {
    fail('annotations.type', 'must be a non-empty string', seasonId, cardId);
  }
  const type = raw.type.trim();
  if (type.length === 0) {
    fail('annotations.type', 'must be a non-empty string', seasonId, cardId);
  }

  const annotationCardId = raw.cardId;
  if (typeof annotationCardId !== 'string' || annotationCardId.trim().length === 0) {
    fail('annotations.cardId', 'must be a non-empty string', seasonId, cardId);
  }
  if (annotationCardId !== cardId) {
    fail('annotations.cardId', `must equal "${cardId}"`, seasonId, cardId);
  }

  const annotation: CardAnnotation = {
    annotationId,
    cardId: annotationCardId,
    type,
    sourceTarget: mapSourceTarget(raw.sourceTarget, seasonId, cardId),
    resolvedTarget: requireSpan(raw.resolvedTarget, seasonId, cardId),
  };
  if ('notes' in raw && raw.notes !== undefined) {
    if (typeof raw.notes !== 'string') {
      fail('annotations.notes', 'must be a string', seasonId, cardId);
    }
    annotation.notes = raw.notes;
  }
  return annotation;
}

function mapAnnotations(
  value: unknown,
  seasonId: string,
  cardId: string,
): CardAnnotation[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    fail('annotations', 'must be an array', seasonId, cardId);
  }
  return value.map((item) => mapAnnotation(item, seasonId, cardId));
}

function mapCrossReference(
  value: unknown,
  seasonId: string,
  cardId: string,
): CardCrossReference {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('crossReferences', 'contains a malformed cross reference', seasonId, cardId);
  }
  const raw = value as Record<string, unknown>;
  if ('fromCardId' in raw && raw.fromCardId !== undefined) {
    const fromCardId = requireNonEmptyString(
      raw.fromCardId,
      'crossReferences.fromCardId',
      seasonId,
      cardId,
    );
    if (fromCardId !== cardId) {
      fail('crossReferences.fromCardId', `must equal "${cardId}"`, seasonId, cardId);
    }
  }

  const reference: CardCrossReference = {};
  if ('toReference' in raw && raw.toReference !== undefined) {
    if (typeof raw.toReference !== 'string') {
      fail('crossReferences.toReference', 'must be a string', seasonId, cardId);
    }
    reference.toReference = raw.toReference;
  }
  if ('toCardId' in raw && raw.toCardId !== undefined) {
    if (typeof raw.toCardId !== 'string') {
      fail('crossReferences.toCardId', 'must be a string', seasonId, cardId);
    }
    reference.toCardId = raw.toCardId;
  }
  if ('notes' in raw && raw.notes !== undefined) {
    if (typeof raw.notes !== 'string') {
      fail('crossReferences.notes', 'must be a string', seasonId, cardId);
    }
    reference.notes = raw.notes;
  }
  return reference;
}

function mapCrossReferences(
  value: unknown,
  seasonId: string,
  cardId: string,
): CardCrossReference[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    fail('crossReferences', 'must be an array', seasonId, cardId);
  }
  return value.map((item) => mapCrossReference(item, seasonId, cardId));
}

function mapQuizMetadata(
  value: unknown,
  seasonId: string,
  cardId: string,
): CardQuizMetadata | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail('quizMetadata', 'must be an object', seasonId, cardId);
  }
  const raw = value as Record<string, unknown>;
  if ('cardId' in raw && raw.cardId !== undefined && raw.cardId !== cardId) {
    fail('quizMetadata.cardId', `must equal "${cardId}"`, seasonId, cardId);
  }

  const metadata: CardQuizMetadata = {};
  if ('pointValue' in raw && raw.pointValue !== undefined) {
    if (typeof raw.pointValue !== 'number' || !Number.isFinite(raw.pointValue)) {
      fail('quizMetadata.pointValue', 'must be a finite number', seasonId, cardId);
    }
    metadata.pointValue = raw.pointValue;
  }
  if ('questionHint' in raw && raw.questionHint !== undefined) {
    if (typeof raw.questionHint !== 'string') {
      fail('quizMetadata.questionHint', 'must be a string', seasonId, cardId);
    }
    metadata.questionHint = raw.questionHint;
  }
  if (metadata.pointValue === undefined && metadata.questionHint === undefined) {
    return undefined;
  }
  return metadata;
}

function mapIndexCode(
  value: unknown,
  seasonId: string,
  cardId: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return requireNonEmptyString(value, 'indexCode', seasonId, cardId);
}

/**
 * Maps one nested Firestore Card document to the domain Card.
 * Document seasonId, materialSetId, and cardId must match the request and
 * the Firestore document id. Missing materialSetId is not stamped.
 * Annotations stay annotations. matchedRules is always empty.
 */
export function mapFirestoreCardToDomain(
  document: unknown,
  seasonId: string,
  materialSetId: string,
  cardId: string,
): Card {
  const resolvedSeasonId = requireNonEmptyString(seasonId, 'seasonId');
  const resolvedMaterialSetId = requireNonEmptyString(
    materialSetId,
    'materialSetId',
    resolvedSeasonId,
  );
  const resolvedCardId = requireNonEmptyString(cardId, 'cardId', resolvedSeasonId);

  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    fail('document', 'must be an object', resolvedSeasonId, resolvedCardId);
  }

  const data = document as Record<string, unknown>;
  requireExactIdentity(data.seasonId, resolvedSeasonId, 'seasonId', resolvedSeasonId, resolvedCardId);
  requireExactIdentity(
    data.materialSetId,
    resolvedMaterialSetId,
    'materialSetId',
    resolvedSeasonId,
    resolvedCardId,
  );
  requireExactIdentity(data.cardId, resolvedCardId, 'cardId', resolvedSeasonId, resolvedCardId);

  const indexCode = mapIndexCode(data.indexCode, resolvedSeasonId, resolvedCardId);
  const quizMetadata = mapQuizMetadata(data.quizMetadata, resolvedSeasonId, resolvedCardId);

  const card: Card = {
    seasonId: resolvedSeasonId,
    materialSetId: resolvedMaterialSetId,
    cardId: resolvedCardId,
    cardNumber: requireCardNumber(data.cardNumber, resolvedSeasonId, resolvedCardId),
    reference: requirePreservedText(data.reference, 'reference', resolvedSeasonId, resolvedCardId),
    verseText: requirePreservedText(
      data.verseText,
      'verseText',
      resolvedSeasonId,
      resolvedCardId,
    ),
    sectionId: requireNonEmptyString(
      data.sectionId,
      'sectionId',
      resolvedSeasonId,
      resolvedCardId,
    ),
    matchedRules: [],
    tags:
      data.tags === undefined
        ? []
        : requireStringArray(data.tags, 'tags', resolvedSeasonId, resolvedCardId),
    annotations: mapAnnotations(data.annotations, resolvedSeasonId, resolvedCardId),
    crossReferences: mapCrossReferences(
      data.crossReferences,
      resolvedSeasonId,
      resolvedCardId,
    ),
  };
  if (indexCode !== undefined) {
    card.indexCode = indexCode;
  }
  if (quizMetadata !== undefined) {
    card.quizMetadata = quizMetadata;
  }
  return card;
}

export interface FirestoreCardSnapshot {
  cardId: string;
  data: unknown;
}

/** Maps snapshots in the given order; does not sort by cardNumber. */
export function mapFirestoreCardsToDomain(
  snapshots: readonly FirestoreCardSnapshot[],
  seasonId: string,
  materialSetId: string,
): Card[] {
  return snapshots.map((snapshot) =>
    mapFirestoreCardToDomain(snapshot.data, seasonId, materialSetId, snapshot.cardId),
  );
}
