/**
 * @jest-environment node
 */
import {
  deriveAnnotationId,
  deriveCardId,
  targetingPayloadForPhraseOccurrence,
} from '../../scripts/content-pipeline/identifiers';

describe('content-pipeline identifiers', () => {
  it('uses an explicit cardId when provided', () => {
    expect(deriveCardId(10, 'c1')).toBe('c1');
    expect(deriveCardId(10, '  custom-id  ')).toBe('custom-id');
  });

  it('derives a stable cardId from cardNumber when none is supplied', () => {
    expect(deriveCardId(3)).toBe('c3');
    expect(deriveCardId(3, '')).toBe('c3');
    expect(deriveCardId(3, '   ')).toBe('c3');
  });

  it('derives the same annotationId for the same targeting fields', () => {
    const payload = targetingPayloadForPhraseOccurrence('the word', 2);
    const first = deriveAnnotationId({
      cardId: 'c2',
      type: 'highlight',
      strategy: 'phraseOccurrence',
      targetingPayload: payload,
    });
    const second = deriveAnnotationId({
      cardId: 'c2',
      type: 'highlight',
      strategy: 'phraseOccurrence',
      targetingPayload: payload,
    });

    expect(first).toBe(second);
    expect(first).toContain('c2');
    expect(first).toContain('highlight');
  });

  it('changes annotationId when the occurrence changes', () => {
    const first = deriveAnnotationId({
      cardId: 'c2',
      type: 'highlight',
      strategy: 'phraseOccurrence',
      targetingPayload: targetingPayloadForPhraseOccurrence('the word', 1),
    });
    const second = deriveAnnotationId({
      cardId: 'c2',
      type: 'highlight',
      strategy: 'phraseOccurrence',
      targetingPayload: targetingPayloadForPhraseOccurrence('the word', 2),
    });

    expect(first).not.toBe(second);
  });
});
