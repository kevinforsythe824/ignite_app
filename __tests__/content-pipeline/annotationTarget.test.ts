/**
 * @jest-environment node
 */
import { SYNTHETIC_VERSES } from '../../scripts/content-pipeline/syntheticData';
import {
  findPhraseOccurrences,
  resolveAnnotationTarget,
} from '../../scripts/content-pipeline/resolveAnnotationTarget';

describe('annotation target resolution', () => {
  const verse = SYNTHETIC_VERSES.repeatedWord.verseText;

  it('finds every non-overlapping exact match', () => {
    const matches = findPhraseOccurrences(verse, 'the word');
    expect(matches).toHaveLength(3);
    for (const match of matches) {
      expect(verse.slice(match.start, match.end)).toBe('the word');
    }
  });

  it('resolves a selected occurrence to start/end offsets', () => {
    const matches = findPhraseOccurrences(verse, 'the word');
    const resolved = resolveAnnotationTarget({
      verseText: verse,
      sourceTarget: {
        strategy: 'phraseOccurrence',
        phrase: 'the word',
        occurrenceIndex: 2,
      },
    });

    expect(resolved.error).toBeUndefined();
    expect(resolved.resolved).toEqual(matches[1]);
    expect(verse.slice(resolved.resolved?.start ?? 0, resolved.resolved?.end ?? 0)).toBe(
      'the word',
    );
  });

  it('fails closed when the phrase never appears', () => {
    const resolved = resolveAnnotationTarget({
      verseText: verse,
      sourceTarget: {
        strategy: 'phraseOccurrence',
        phrase: 'missing phrase',
        occurrenceIndex: 1,
      },
    });

    expect(resolved.error?.code).toBe('unresolved_phrase_target');
    expect(resolved.error?.reason).toMatch(/does not appear/);
  });

  it('resolves a unique phrase with a blank occurrenceIndex as occurrence 1', () => {
    const uniqueVerse = SYNTHETIC_VERSES.short.verseText;
    const matches = findPhraseOccurrences(uniqueVerse, 'Light');
    const resolved = resolveAnnotationTarget({
      verseText: uniqueVerse,
      sourceTarget: {
        strategy: 'phraseOccurrence',
        phrase: 'Light',
      },
    });

    expect(matches).toHaveLength(1);
    expect(resolved.error).toBeUndefined();
    expect(resolved.occurrenceIndex).toBe(1);
    expect(resolved.resolved).toEqual(matches[0]);
  });

  it('does not silently pick the first match when the phrase repeats', () => {
    const missingIndex = resolveAnnotationTarget({
      verseText: verse,
      sourceTarget: {
        strategy: 'phraseOccurrence',
        phrase: 'the word',
      },
    });
    const outOfRange = resolveAnnotationTarget({
      verseText: verse,
      sourceTarget: {
        strategy: 'phraseOccurrence',
        phrase: 'the word',
        occurrenceIndex: 4,
      },
    });

    expect(missingIndex.error?.code).toBe('ambiguous_phrase_target');
    expect(missingIndex.error?.reason).toBe(
      'Phrase "the word" occurs 3 times. Enter occurrenceIndex 1, 2, or 3.',
    );
    expect(outOfRange.error?.code).toBe('ambiguous_phrase_target');
    expect(outOfRange.error?.reason).toMatch(/outside that range/);
    expect(missingIndex.resolved).toBeUndefined();
    expect(outOfRange.resolved).toBeUndefined();
  });

  it('rejects an unsupported strategy without inventing a mapping', () => {
    const resolved = resolveAnnotationTarget({
      verseText: verse,
      sourceTarget: {
        strategy: 'officialCommitteePending',
        phrase: 'the word',
        occurrenceIndex: 1,
      } as never,
    });

    expect(resolved.error?.code).toBe('unsupported_annotation_strategy');
    expect(resolved.error?.reason).toMatch(/Phase 2B/);
  });
});
