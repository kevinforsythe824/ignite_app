import { createHash } from 'node:crypto';

/**
 * Synthetic/DEV identifier policy (Phase 2A.1).
 *
 * Humans enter: seasonId, materialSetId, divisionId, displayName, cardNumber,
 * reference, verseText, section title/order/sectionId, annotation type/targeting,
 * and optional quiz/cross-ref fields.
 *
 * cardId:
 *   - Use the explicit cardId when the author supplies one (needed so the same
 *     local cardId can appear in multiple MaterialSets, and for collision tests).
 *   - Otherwise derive `c{cardNumber}` from the MaterialSet-local card number.
 *   - Derivation is deterministic. No random UUIDs.
 *
 * annotationId:
 *   - Deterministic from cardId + type + strategy + targeting fields.
 *
 * Official committee ID mapping is Phase 2B and is not implied by this policy.
 */

export function deriveCardId(cardNumber: number, explicitCardId?: string): string {
  const trimmed = explicitCardId?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `c${cardNumber}`;
}

export function deriveAnnotationId(input: {
  cardId: string;
  type: string;
  strategy: string;
  targetingPayload: string;
}): string {
  const digest = createHash('sha256')
    .update(
      [input.cardId, input.type, input.strategy, input.targetingPayload].join('\u001f'),
      'utf8',
    )
    .digest('hex')
    .slice(0, 12);
  return `${sanitizeIdPart(input.cardId)}__${sanitizeIdPart(input.type)}__${digest}`;
}

/**
 * Targeting payload for a resolved phrase occurrence.
 * Pass the normalized 1-based index. A blank authoring cell for a unique
 * phrase is already normalized to 1 before this is called.
 */
export function targetingPayloadForPhraseOccurrence(
  phrase: string,
  occurrenceIndex: number,
): string {
  return `phraseOccurrence:${phrase}:${occurrenceIndex}`;
}

function sanitizeIdPart(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned.length > 0 ? cleaned : 'id';
}
