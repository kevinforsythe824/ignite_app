import type { CardAnnotation } from '../src/features/flashcards/domain/card';
import { FREQUENCY_TIER_VALUES } from '../src/features/flashcards/domain/card';
import { colors } from '../src/shared/theme';
import {
  OFFICIAL_FREQUENCY_TIERS,
  segmentOfficialAnnotations,
  type OfficialAnnotationDiagnosticCode,
  type OfficialFrequencyTier,
  type OfficialScriptureAnnotationInput,
  type OfficialScriptureSegmentation,
} from '../src/shared/scripture/segmentOfficialAnnotations';

const VERSE = 'alpha beta alpha.';

function annotation(
  overrides: OfficialScriptureAnnotationInput,
): OfficialScriptureAnnotationInput {
  return overrides;
}

function segment(
  verseText: string,
  annotations?: readonly OfficialScriptureAnnotationInput[] | null,
  cardId?: string,
): OfficialScriptureSegmentation {
  return segmentOfficialAnnotations({ verseText, annotations, cardId });
}

function expectPreserved(
  verseText: string,
  annotations?: readonly OfficialScriptureAnnotationInput[] | null,
  cardId?: string,
): OfficialScriptureSegmentation {
  const result = segment(verseText, annotations, cardId);
  expect(result.canonicalText).toBe(verseText);
  expect(result.runs.map((run) => run.text).join('')).toBe(verseText);
  for (const run of result.runs) {
    expect(run.text).toBe(verseText.slice(run.start, run.end));
    expect(run.end).toBeGreaterThan(run.start);
  }
  return result;
}

function expectSpan(
  result: OfficialScriptureSegmentation,
  start: number,
  end: number,
  expected: { bold: boolean; underline: boolean; frequencyTier?: OfficialFrequencyTier },
): void {
  let cursor = start;
  const covering = result.runs.filter((run) => run.start < end && end > start && run.end > start && run.start < end);
  expect(covering.length).toBeGreaterThan(0);
  for (const run of covering) {
    expect(Math.max(run.start, start)).toBe(cursor);
    expect(run.bold).toBe(expected.bold);
    expect(run.underline).toBe(expected.underline);
    expect(run.frequencyTier).toBe(expected.frequencyTier);
    cursor = Math.min(run.end, end);
  }
  expect(cursor).toBe(end);
}

function expectChar(
  result: OfficialScriptureSegmentation,
  index: number,
  expected: { bold: boolean; underline: boolean; frequencyTier?: OfficialFrequencyTier },
): void {
  const run = result.runs.find((item) => item.start <= index && index < item.end);
  expect(run).toBeDefined();
  expect(run?.bold).toBe(expected.bold);
  expect(run?.underline).toBe(expected.underline);
  expect(run?.frequencyTier).toBe(expected.frequencyTier);
}

function codes(result: OfficialScriptureSegmentation): OfficialAnnotationDiagnosticCode[] {
  return result.diagnostics.map((item) => item.code);
}

describe('official frequency tokens', () => {
  it('keeps tiers 1–5 aligned with the card domain and off the legacy keyword palette', () => {
    expect([...OFFICIAL_FREQUENCY_TIERS]).toEqual([...FREQUENCY_TIER_VALUES]);
    expect(colors.officialFrequency1).toBe('#1F4E9C');
    expect(colors.officialFrequency2).toBe('#1E7A32');
    expect(colors.officialFrequency3).toBe('#C4600A');
    expect(colors.officialFrequency4).toBe('#6B2FA0');
    expect(colors.officialFrequency5).toBe('#7A4A22');
    expect(colors.keyword1x).toBe('#3B82F6');
    expect(colors.keyword2x).toBe('#15803D');
    expect(colors.keyword3x).toBe('#EA580C');
  });
});

describe('segmentOfficialAnnotations', () => {
  describe('A. plain text', () => {
    it('returns the verse unchanged when annotations are absent', () => {
      for (const annotations of [undefined, null, []] as const) {
        const result = expectPreserved('Alpha, beta.\nGamma!', annotations);
        expect(result.runs).toEqual([
          {
            text: 'Alpha, beta.\nGamma!',
            start: 0,
            end: 'Alpha, beta.\nGamma!'.length,
            bold: false,
            underline: false,
          },
        ]);
        expect(result.indicators).toEqual([]);
        expect(result.diagnostics).toEqual([]);
      }
    });

    it('preserves an empty verse', () => {
      const result = expectPreserved('', []);
      expect(result.runs).toEqual([]);
      expect(result.indicators).toEqual([]);
    });

    it('preserves punctuation, spaces, and newlines with no annotations applied', () => {
      const verse = '(Hello —  world.)\n\n"Done."';
      const result = expectPreserved(verse, []);
      expect(result.runs.map((run) => run.text).join('')).toBe(verse);
      expect(result.runs.every((run) => run.bold === false && run.underline === false)).toBe(true);
    });
  });

  describe('B. unique beginning', () => {
    it('bolds the exact span and leaves a leading parenthesis plain', () => {
      const verse = '(alpha beta';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'beg',
          cardId: 'c1',
          type: 'uniqueBeginning',
          sourceTarget: { phrase: 'alpha' },
          resolvedTarget: { start: 1, end: 6 },
        }),
      ]);
      expectChar(result, 0, { bold: false, underline: false });
      expectSpan(result, 1, 6, { bold: true, underline: false });
      expectChar(result, 6, { bold: false, underline: false });
      expect(result.indicators).toEqual([]);
    });

    it('bolds leading punctuation when that punctuation is inside the span', () => {
      const verse = '(alpha';
      const result = expectPreserved(verse, [
        annotation({
          type: 'uniqueBeginning',
          sourceTarget: { phrase: '(alpha' },
          resolvedTarget: { start: 0, end: 6 },
        }),
      ]);
      expectSpan(result, 0, 6, { bold: true, underline: false });
    });

    it('bolds the supplied occurrence when the phrase is repeated', () => {
      const verse = 'alpha alpha';
      const result = expectPreserved(verse, [
        annotation({
          type: 'uniqueBeginning',
          sourceTarget: { phrase: 'alpha' },
          resolvedTarget: { start: 6, end: 11 },
        }),
      ]);
      expectSpan(result, 0, 5, { bold: false, underline: false });
      expectChar(result, 5, { bold: false, underline: false });
      expectSpan(result, 6, 11, { bold: true, underline: false });
    });
  });

  describe('C. unique ending', () => {
    it('underlines the exact span and leaves trailing punctuation plain', () => {
      const verse = 'alpha.';
      const result = expectPreserved(verse, [
        annotation({
          type: 'uniqueEnding',
          sourceTarget: { phrase: 'alpha' },
          resolvedTarget: { start: 0, end: 5 },
        }),
      ]);
      expectSpan(result, 0, 5, { bold: false, underline: true });
      expectChar(result, 5, { bold: false, underline: false });
    });

    it('underlines trailing punctuation when it is inside the span', () => {
      const verse = 'alpha.';
      const result = expectPreserved(verse, [
        annotation({
          type: 'uniqueEnding',
          sourceTarget: { phrase: 'alpha.' },
          resolvedTarget: { start: 0, end: 6 },
        }),
      ]);
      expectSpan(result, 0, 6, { bold: false, underline: true });
    });

    it('underlines the supplied occurrence and leaves the other copy plain', () => {
      const verse = 'alpha alpha';
      const result = expectPreserved(verse, [
        annotation({
          type: 'uniqueEnding',
          sourceTarget: { phrase: 'alpha' },
          resolvedTarget: { start: 0, end: 5 },
        }),
      ]);
      expectSpan(result, 0, 5, { bold: false, underline: true });
      expectSpan(result, 6, 11, { bold: false, underline: false });
    });
  });

  describe('D. frequency', () => {
    it.each([1, 2, 3, 4, 5] as const)('colors tier %s and emits one superscript at the end boundary', (tier) => {
      const verse = 'WoRd';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: `f-${tier}`,
          type: 'frequency',
          frequencyTier: tier,
          sourceTarget: { phrase: 'WoRd' },
          resolvedTarget: { start: 0, end: 4 },
        }),
      ]);
      expectSpan(result, 0, 4, { bold: false, underline: false, frequencyTier: tier });
      expect(result.indicators).toEqual([{ offset: 4, tier, annotationId: `f-${tier}` }]);
      expect(result.runs.map((run) => run.text).join('')).toBe('WoRd');
    });

    it('colors only the supplied occurrence of a repeated word', () => {
      const verse = 'hope hope';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'f',
          type: 'frequency',
          frequencyTier: 2,
          sourceTarget: { phrase: 'hope' },
          resolvedTarget: { start: 5, end: 9 },
        }),
      ]);
      expectSpan(result, 0, 4, { bold: false, underline: false });
      expectChar(result, 4, { bold: false, underline: false });
      expectSpan(result, 5, 9, { bold: false, underline: false, frequencyTier: 2 });
      expect(result.indicators).toEqual([{ offset: 9, tier: 2, annotationId: 'f' }]);
    });

    it('does not insert a space around the indicator offset', () => {
      const verse = 'ab';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'f',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 0, end: 1 },
        }),
      ]);
      expect(result.runs.map((run) => run.text)).toEqual(['a', 'b']);
      expect(result.indicators).toEqual([{ offset: 1, tier: 1, annotationId: 'f' }]);
    });

    it('does not invent tier 1 when frequencyTier is missing or invalid', () => {
      const verse = 'alpha beta';
      const cases: OfficialScriptureAnnotationInput[] = [
        annotation({
          annotationId: 'missing',
          type: 'frequency',
          resolvedTarget: { start: 0, end: 5 },
          sourceTarget: { phrase: 'alpha' },
        }),
        annotation({
          annotationId: 'zero',
          type: 'frequency',
          frequencyTier: 0,
          resolvedTarget: { start: 0, end: 5 },
        }),
        annotation({
          annotationId: 'six',
          type: 'frequency',
          frequencyTier: 6,
          resolvedTarget: { start: 0, end: 5 },
        }),
        annotation({
          annotationId: 'fraction',
          type: 'frequency',
          frequencyTier: 1.5,
          resolvedTarget: { start: 0, end: 5 },
        }),
        annotation({
          annotationId: 'text',
          type: 'frequency',
          frequencyTier: '1' as unknown as number,
          resolvedTarget: { start: 0, end: 5 },
        }),
      ];

      for (const item of cases) {
        const result = expectPreserved(verse, [
          item,
          annotation({
            annotationId: 'kept',
            type: 'frequency',
            frequencyTier: 4,
            resolvedTarget: { start: 6, end: 10 },
            sourceTarget: { phrase: 'beta' },
          }),
        ]);
        expectSpan(result, 0, 5, { bold: false, underline: false });
        expectSpan(result, 6, 10, { bold: false, underline: false, frequencyTier: 4 });
        expect(result.indicators).toEqual([{ offset: 10, tier: 4, annotationId: 'kept' }]);
      }

      const missing = expectPreserved(verse, [cases[0]!]);
      expect(codes(missing)).toEqual(['missing_frequency_tier']);
      const invalid = expectPreserved(verse, [cases[1]!]);
      expect(codes(invalid)).toEqual(['invalid_frequency_tier']);
    });

    it('emits one indicator when an overlap splits the colored span', () => {
      const verse = 'abcdefg';
      const result = expectPreserved(verse, [
        annotation({
          type: 'uniqueBeginning',
          resolvedTarget: { start: 0, end: 4 },
          sourceTarget: { phrase: 'abcd' },
        }),
        annotation({
          annotationId: 'f',
          type: 'frequency',
          frequencyTier: 5,
          resolvedTarget: { start: 2, end: 6 },
          sourceTarget: { phrase: 'cdef' },
        }),
      ]);
      expectSpan(result, 0, 2, { bold: true, underline: false });
      expectSpan(result, 2, 4, { bold: true, underline: false, frequencyTier: 5 });
      expectSpan(result, 4, 6, { bold: false, underline: false, frequencyTier: 5 });
      expectChar(result, 6, { bold: false, underline: false });
      expect(result.indicators).toEqual([{ offset: 6, tier: 5, annotationId: 'f' }]);
    });
  });

  describe('E. overlaps', () => {
    it('composes beginning and frequency', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({ type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 4 } }),
        annotation({
          annotationId: 'f',
          type: 'frequency',
          frequencyTier: 2,
          resolvedTarget: { start: 2, end: 4 },
        }),
      ]);
      expectSpan(result, 0, 2, { bold: true, underline: false });
      expectSpan(result, 2, 4, { bold: true, underline: false, frequencyTier: 2 });
      expectSpan(result, 4, 6, { bold: false, underline: false });
      expect(result.indicators).toEqual([{ offset: 4, tier: 2, annotationId: 'f' }]);
    });

    it('composes ending and frequency', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({ type: 'uniqueEnding', resolvedTarget: { start: 2, end: 6 } }),
        annotation({
          annotationId: 'f',
          type: 'frequency',
          frequencyTier: 3,
          resolvedTarget: { start: 2, end: 4 },
        }),
      ]);
      expectSpan(result, 0, 2, { bold: false, underline: false });
      expectSpan(result, 2, 4, { bold: false, underline: true, frequencyTier: 3 });
      expectSpan(result, 4, 6, { bold: false, underline: true });
      expect(result.indicators).toEqual([{ offset: 4, tier: 3, annotationId: 'f' }]);
    });

    it('composes beginning and ending', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({ type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 4 } }),
        annotation({ type: 'uniqueEnding', resolvedTarget: { start: 2, end: 6 } }),
      ]);
      expectSpan(result, 0, 2, { bold: true, underline: false });
      expectSpan(result, 2, 4, { bold: true, underline: true });
      expectSpan(result, 4, 6, { bold: false, underline: true });
      expect(result.indicators).toEqual([]);
    });

    it('composes beginning, ending, and frequency, including a nested frequency', () => {
      const verse = 'abcdefghij';
      const result = expectPreserved(verse, [
        annotation({ type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 10 } }),
        annotation({ type: 'uniqueEnding', resolvedTarget: { start: 2, end: 8 } }),
        annotation({
          annotationId: 'f',
          type: 'frequency',
          frequencyTier: 3,
          resolvedTarget: { start: 4, end: 6 },
        }),
      ]);
      expectSpan(result, 0, 2, { bold: true, underline: false });
      expectSpan(result, 2, 4, { bold: true, underline: true });
      expectSpan(result, 4, 6, { bold: true, underline: true, frequencyTier: 3 });
      expectSpan(result, 6, 8, { bold: true, underline: true });
      expectSpan(result, 8, 10, { bold: true, underline: false });
      expect(result.indicators).toEqual([{ offset: 6, tier: 3, annotationId: 'f' }]);
    });

    it('styles a partial overlap without dropping either annotation', () => {
      const verse = 'abcdefghi';
      const result = expectPreserved(verse, [
        annotation({ type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 6 } }),
        annotation({
          annotationId: 'f',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 4, end: 8 },
        }),
      ]);
      expectSpan(result, 0, 4, { bold: true, underline: false });
      expectSpan(result, 4, 6, { bold: true, underline: false, frequencyTier: 1 });
      expectSpan(result, 6, 8, { bold: false, underline: false, frequencyTier: 1 });
      expectChar(result, 8, { bold: false, underline: false });
      expect(result.indicators).toEqual([{ offset: 8, tier: 1, annotationId: 'f' }]);
    });

    it('keeps adjacent annotations on their own characters', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({ type: 'uniqueBeginning', resolvedTarget: { start: 0, end: 3 } }),
        annotation({ type: 'uniqueEnding', resolvedTarget: { start: 3, end: 6 } }),
      ]);
      expectSpan(result, 0, 3, { bold: true, underline: false });
      expectSpan(result, 3, 6, { bold: false, underline: true });
    });

    it('stacks beginning and ending on identical boundaries', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({ type: 'uniqueBeginning', resolvedTarget: { start: 1, end: 4 } }),
        annotation({ type: 'uniqueEnding', resolvedTarget: { start: 1, end: 4 } }),
      ]);
      expectChar(result, 0, { bold: false, underline: false });
      expectSpan(result, 1, 4, { bold: true, underline: true });
      expectSpan(result, 4, 6, { bold: false, underline: false });
    });

    it('colors the union when two frequency annotations share a tier', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'a',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 0, end: 4 },
        }),
        annotation({
          annotationId: 'b',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 2, end: 6 },
        }),
      ]);
      expectSpan(result, 0, 6, { bold: false, underline: false, frequencyTier: 1 });
      expect(result.indicators).toEqual([
        { offset: 4, tier: 1, annotationId: 'a' },
        { offset: 6, tier: 1, annotationId: 'b' },
      ]);
      expect(codes(result)).toEqual([]);
    });

    it('drops both frequency annotations when tiers contradict on the same characters', () => {
      const verse = 'abcdefgh';
      const result = expectPreserved(verse, [
        annotation({
          type: 'uniqueBeginning',
          resolvedTarget: { start: 0, end: 2 },
          sourceTarget: { phrase: 'ab' },
        }),
        annotation({
          annotationId: 'low',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 0, end: 5 },
        }),
        annotation({
          annotationId: 'high',
          type: 'frequency',
          frequencyTier: 2,
          resolvedTarget: { start: 3, end: 7 },
        }),
      ]);
      expect(result.runs.every((run) => run.frequencyTier === undefined)).toBe(true);
      expect(result.indicators).toEqual([]);
      expectSpan(result, 0, 2, { bold: true, underline: false });
      expectSpan(result, 2, 8, { bold: false, underline: false });
      expect(codes(result)).toEqual(['conflicting_frequency_tiers', 'conflicting_frequency_tiers']);
      expect(result.diagnostics.map((item) => item.annotationId)).toEqual(['low', 'high']);
    });

    it('still colors a frequency annotation that does not share characters with the conflict', () => {
      const verse = 'abcdefgh';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'a',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 0, end: 2 },
        }),
        annotation({
          annotationId: 'b',
          type: 'frequency',
          frequencyTier: 2,
          resolvedTarget: { start: 0, end: 2 },
        }),
        annotation({
          annotationId: 'c',
          type: 'frequency',
          frequencyTier: 5,
          resolvedTarget: { start: 4, end: 6 },
        }),
      ]);
      expectSpan(result, 0, 2, { bold: false, underline: false });
      expectSpan(result, 4, 6, { bold: false, underline: false, frequencyTier: 5 });
      expect(result.indicators).toEqual([{ offset: 6, tier: 5, annotationId: 'c' }]);
    });

    it('treats adjacent frequency tiers as separate annotations', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'a',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 0, end: 3 },
        }),
        annotation({
          annotationId: 'b',
          type: 'frequency',
          frequencyTier: 4,
          resolvedTarget: { start: 3, end: 6 },
        }),
      ]);
      expectSpan(result, 0, 3, { bold: false, underline: false, frequencyTier: 1 });
      expectSpan(result, 3, 6, { bold: false, underline: false, frequencyTier: 4 });
      expect(result.indicators).toEqual([
        { offset: 3, tier: 1, annotationId: 'a' },
        { offset: 6, tier: 4, annotationId: 'b' },
      ]);
      expect(codes(result)).toEqual([]);
    });
  });

  describe('F. malformed annotations', () => {
    it('does not throw and drops only the invalid annotation', () => {
      const verse = 'abcdef';
      const valid = annotation({
        annotationId: 'beg',
        cardId: 'c1',
        type: 'uniqueBeginning',
        resolvedTarget: { start: 0, end: 3 },
        sourceTarget: { phrase: 'abc' },
      });

      expect(() =>
        segment(verse, [
          null as unknown as OfficialScriptureAnnotationInput,
          'bad' as unknown as OfficialScriptureAnnotationInput,
          { type: 'frequency' },
          { type: 'frequency', resolvedTarget: { start: '0' as unknown as number, end: 2 } },
          { type: 'uniqueEnding', resolvedTarget: { start: 4, end: 1 } },
          { type: 'uniqueEnding', resolvedTarget: { start: 3, end: 3 } },
          { type: 'uniqueEnding', resolvedTarget: { start: -1, end: 2 } },
          { type: 'uniqueEnding', resolvedTarget: { start: 5, end: 8 } },
          { type: 'uniqueEnding', cardId: 'other', resolvedTarget: { start: 3, end: 6 } },
          {
            type: 'uniqueEnding',
            resolvedTarget: { start: 3, end: 6 },
            sourceTarget: { phrase: 'nope' },
          },
          { type: 'keyword', resolvedTarget: { start: 0, end: 3 } },
          valid,
        ], 'c1'),
      ).not.toThrow();

      const result = expectPreserved(verse, [
        null as unknown as OfficialScriptureAnnotationInput,
        annotation({
          annotationId: 'oob',
          cardId: 'c1',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 5, end: 9 },
        }),
        valid,
      ], 'c1');
      expectSpan(result, 0, 3, { bold: true, underline: false });
      expectSpan(result, 3, 6, { bold: false, underline: false });
      expect(result.indicators).toEqual([]);
      expect(codes(result)).toEqual(['invalid_annotation', 'out_of_bounds']);
    });

    it('reports each malformed span condition', () => {
      const verse = 'abcdef';
      expect(codes(segment(verse, [{ type: 'uniqueBeginning' }]))).toEqual(['invalid_span']);
      expect(codes(segment(verse, [{ type: 'uniqueBeginning', resolvedTarget: { start: 4, end: 2 } }]))).toEqual([
        'reversed_span',
      ]);
      expect(codes(segment(verse, [{ type: 'uniqueBeginning', resolvedTarget: { start: 2, end: 2 } }]))).toEqual([
        'zero_length',
      ]);
      expect(codes(segment(verse, [{ type: 'uniqueBeginning', resolvedTarget: { start: 4, end: 4 } }]))).toEqual([
        'zero_length',
      ]);
      expect(codes(segment(verse, [{ type: 'uniqueBeginning', resolvedTarget: { start: -1, end: 2 } }]))).toEqual([
        'out_of_bounds',
      ]);
      expect(codes(segment(verse, [{ type: 'uniqueBeginning', resolvedTarget: { start: 2, end: 9 } }]))).toEqual([
        'out_of_bounds',
      ]);
    });

    it('drops a wrong card and a phrase mismatch without retargeting the verse', () => {
      const verse = 'alpha alpha';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'owner',
          cardId: 'c9',
          type: 'uniqueBeginning',
          resolvedTarget: { start: 0, end: 5 },
          sourceTarget: { phrase: 'alpha' },
        }),
        annotation({
          annotationId: 'phrase',
          cardId: 'c1',
          type: 'uniqueEnding',
          resolvedTarget: { start: 6, end: 11 },
          sourceTarget: { phrase: 'nope' },
        }),
        annotation({
          annotationId: 'kept',
          cardId: 'c1',
          type: 'frequency',
          frequencyTier: 2,
          resolvedTarget: { start: 0, end: 5 },
          sourceTarget: { phrase: 'alpha' },
        }),
      ], 'c1');

      expect(codes(result)).toEqual(['wrong_card', 'phrase_mismatch']);
      expectSpan(result, 0, 5, { bold: false, underline: false, frequencyTier: 2 });
      expectSpan(result, 6, 11, { bold: false, underline: false });
      expect(result.indicators).toEqual([{ offset: 5, tier: 2, annotationId: 'kept' }]);
    });

    it('checks card ownership only when a card id is supplied', () => {
      const verse = 'alpha';
      const marked = [
        annotation({
          cardId: 'c9',
          type: 'uniqueBeginning',
          resolvedTarget: { start: 0, end: 5 },
          sourceTarget: { phrase: 'alpha' },
        }),
      ];
      expectSpan(expectPreserved(verse, marked), 0, 5, { bold: true, underline: false });
      const rejected = expectPreserved(verse, marked, 'c1');
      expect(codes(rejected)).toEqual(['wrong_card']);
      expectSpan(rejected, 0, 5, { bold: false, underline: false });
    });

    it('ignores unsupported types and still applies a valid neighbour', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'xref',
          type: 'crossReference',
          resolvedTarget: { start: 0, end: 3 },
        }),
        annotation({ type: 'keyword', resolvedTarget: { start: 0, end: 3 } }),
        annotation({ type: 'highlight', resolvedTarget: { start: 3, end: 6 } }),
        annotation({ type: 'person', resolvedTarget: { start: 0, end: 6 } }),
        annotation({
          type: 'uniqueEnding',
          resolvedTarget: { start: 3, end: 6 },
          sourceTarget: { phrase: 'def' },
        }),
      ]);
      expect(codes(result)).toEqual([
        'unsupported_type',
        'unsupported_type',
        'unsupported_type',
        'unsupported_type',
      ]);
      expectSpan(result, 0, 3, { bold: false, underline: false });
      expectSpan(result, 3, 6, { bold: false, underline: true });
    });

    it('renders the verse plain when every annotation is invalid', () => {
      const verse = 'plain text';
      const result = expectPreserved(verse, [
        annotation({ type: 'frequency', resolvedTarget: { start: 0, end: 0 } }),
        annotation({ type: 'uniqueBeginning', resolvedTarget: { start: 8, end: 2 } }),
      ]);
      expect(result.runs).toEqual([
        { text: verse, start: 0, end: verse.length, bold: false, underline: false },
      ]);
      expect(result.indicators).toEqual([]);
      expect(codes(result)).toEqual(['zero_length', 'reversed_span']);
    });

    it('rejects a non-array annotation collection without throwing', () => {
      const result = segmentOfficialAnnotations({
        verseText: 'abc',
        annotations: { type: 'uniqueBeginning' } as unknown as OfficialScriptureAnnotationInput[],
      });
      expect(result.canonicalText).toBe('abc');
      expect(result.runs.map((run) => run.text).join('')).toBe('abc');
      expect(codes(result)).toEqual(['invalid_annotations']);
    });

    it('rejects a non-string verse without throwing', () => {
      expect(() =>
        segmentOfficialAnnotations({ verseText: undefined as unknown as string, annotations: [] }),
      ).not.toThrow();
      const result = segmentOfficialAnnotations({
        verseText: undefined as unknown as string,
        annotations: [],
      });
      expect(result.canonicalText).toBe('');
      expect(result.runs).toEqual([]);
      expect(codes(result)).toEqual(['invalid_verse_text']);
    });
  });

  describe('text preservation and isolation', () => {
    it('accepts a domain CardAnnotation without converting it to matchedRules', () => {
      const domainAnnotation: CardAnnotation = {
        annotationId: 'ann-1',
        cardId: 'c1',
        type: 'uniqueBeginning',
        sourceTarget: { strategy: 'phraseOccurrence', phrase: 'alpha', occurrenceIndex: 1 },
        resolvedTarget: { start: 0, end: 5 },
      };
      const result = expectPreserved('alpha beta', [domainAnnotation], 'c1');
      expectSpan(result, 0, 5, { bold: true, underline: false });
      expect(result.diagnostics).toEqual([]);
    });

    it('does not leak formatting between two material sets that share a reference string', () => {
      const verse = 'alpha beta alpha';
      const cadet = expectPreserved(verse, [
        annotation({
          annotationId: 'beg',
          cardId: 'c1',
          type: 'uniqueBeginning',
          resolvedTarget: { start: 0, end: 5 },
          sourceTarget: { phrase: 'alpha' },
        }),
      ], 'c1');
      const junior = expectPreserved(verse, [
        annotation({
          annotationId: 'freq',
          cardId: 'c40',
          type: 'frequency',
          frequencyTier: 4,
          resolvedTarget: { start: 6, end: 10 },
          sourceTarget: { phrase: 'beta' },
        }),
      ], 'c40');

      expect(cadet.runs.some((run) => run.bold)).toBe(true);
      expect(cadet.runs.some((run) => run.frequencyTier !== undefined)).toBe(false);
      expect(cadet.indicators).toEqual([]);
      expect(junior.runs.some((run) => run.bold)).toBe(false);
      expect(junior.runs.some((run) => run.frequencyTier === 4)).toBe(true);
      expect(junior.indicators).toEqual([{ offset: 10, tier: 4, annotationId: 'freq' }]);
      expect(cadet.runs).not.toBe(junior.runs);
    });

    it('returns a fresh result when the same reference is segmented twice', () => {
      const verse = VERSE;
      const annotations = [
        annotation({
          cardId: 'c1',
          type: 'uniqueEnding',
          resolvedTarget: { start: 11, end: 16 },
          sourceTarget: { phrase: 'alpha' },
        }),
      ];
      const first = expectPreserved(verse, annotations, 'c1');
      annotations.push(
        annotation({
          annotationId: 'f',
          cardId: 'c1',
          type: 'frequency',
          frequencyTier: 1,
          resolvedTarget: { start: 0, end: 5 },
        }),
      );
      const second = expectPreserved(verse, annotations, 'c1');
      expect(first.indicators).toEqual([]);
      expect(second.indicators).toEqual([{ offset: 5, tier: 1, annotationId: 'f' }]);
      first.runs[0]!.text = 'MUTATED';
      const third = expectPreserved(verse, annotations, 'c1');
      expect(third.runs[0]?.text).toBe('alpha');
      expect(third.canonicalText).toBe(verse);
    });
  });

  describe('G. duplicate annotation identities', () => {
    function frequency(
      annotationId: string,
      start: number,
      end: number,
      tier: OfficialFrequencyTier,
      phrase?: string,
    ): OfficialScriptureAnnotationInput {
      return annotation({
        annotationId,
        type: 'frequency',
        frequencyTier: tier,
        resolvedTarget: { start, end },
        ...(phrase === undefined ? {} : { sourceTarget: { phrase } }),
      });
    }

    it('drops identical frequency records that share an annotation id', () => {
      const verse = 'hope hope';
      const record = frequency('same', 0, 4, 2, 'hope');
      const result = expectPreserved(verse, [record, { ...record }]);

      expect(result.diagnostics).toEqual([
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
      ]);
      expect(result.indicators).toEqual([]);
      expect(result.runs.every((run) => run.frequencyTier === undefined && !run.bold && !run.underline)).toBe(true);
      expect(result.runs.map((run) => run.text).join('')).toBe(verse);

      const triple = expectPreserved(verse, [record, { ...record }, { ...record }]);
      expect(triple.diagnostics).toHaveLength(3);
      expect(triple.indicators).toEqual([]);
      expect(triple.canonicalText).toBe(verse);
    });

    it('drops a repeated annotation id when the records disagree', () => {
      const verse = 'hope hope';
      const tiers = expectPreserved(verse, [
        frequency('same', 0, 4, 2, 'hope'),
        frequency('same', 5, 9, 5, 'hope'),
      ]);
      expect(tiers.diagnostics).toEqual([
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
      ]);
      expect(codes(tiers)).not.toContain('conflicting_frequency_tiers');
      expect(tiers.indicators).toEqual([]);
      expect(tiers.runs.every((run) => run.frequencyTier === undefined)).toBe(true);
      expect(tiers.runs.map((run) => run.text).join('')).toBe(verse);

      const types = expectPreserved(verse, [
        annotation({
          annotationId: 'same',
          type: 'uniqueBeginning',
          resolvedTarget: { start: 0, end: 4 },
          sourceTarget: { phrase: 'hope' },
        }),
        frequency('same', 0, 4, 2, 'hope'),
      ]);
      expect(types.diagnostics).toEqual([
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'uniqueBeginning' },
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
      ]);
      expect(types.indicators).toEqual([]);
      expect(types.runs.every((run) => !run.bold && run.frequencyTier === undefined)).toBe(true);
      expect(types.canonicalText).toBe(verse);
    });

    it('does not keep the structurally valid copy of a repeated annotation id', () => {
      const verse = 'hope hope';
      const result = expectPreserved(
        verse,
        [
          frequency('same', 0, 4, 2, 'hope'),
          annotation({
            annotationId: 'same',
            cardId: 'c9',
            type: 'frequency',
            frequencyTier: 5,
            resolvedTarget: { start: 40, end: 44 },
          }),
        ],
        'c1',
      );

      expect(result.diagnostics).toEqual([
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
      ]);
      expect(result.indicators).toEqual([]);
      expect(result.runs).toEqual([
        { text: verse, start: 0, end: verse.length, bold: false, underline: false },
      ]);
    });

    it('keeps annotations whose ids are not repeated', () => {
      const verse = 'hope hope';
      const result = expectPreserved(verse, [
        frequency('same', 0, 4, 2, 'hope'),
        frequency('same', 0, 4, 2, 'hope'),
        annotation({
          annotationId: 'ending',
          type: 'uniqueEnding',
          resolvedTarget: { start: 5, end: 9 },
          sourceTarget: { phrase: 'hope' },
        }),
        frequency('kept', 5, 9, 3, 'hope'),
      ]);

      expect(result.diagnostics).toEqual([
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
        { code: 'duplicate_annotation_id', annotationId: 'same', type: 'frequency' },
      ]);
      expectSpan(result, 0, 4, { bold: false, underline: false });
      expectChar(result, 4, { bold: false, underline: false });
      expectSpan(result, 5, 9, { bold: false, underline: true, frequencyTier: 3 });
      expect(result.indicators).toEqual([{ offset: 9, tier: 3, annotationId: 'kept' }]);
      expect(result.canonicalText).toBe(verse);
    });

    it('does not let a repeated id cancel a distinct overlapping frequency', () => {
      const verse = 'abcdefgh';
      const result = expectPreserved(verse, [
        frequency('same', 0, 4, 1),
        frequency('same', 0, 4, 1),
        frequency('kept', 2, 6, 2),
      ]);

      expect(codes(result)).toEqual(['duplicate_annotation_id', 'duplicate_annotation_id']);
      expect(result.indicators).toEqual([{ offset: 6, tier: 2, annotationId: 'kept' }]);
      expectSpan(result, 0, 2, { bold: false, underline: false });
      expectSpan(result, 2, 6, { bold: false, underline: false, frequencyTier: 2 });
      expectSpan(result, 6, 8, { bold: false, underline: false });
      expect(result.runs.map((run) => run.text).join('')).toBe(verse);
    });

    it('applies a later valid annotation after a duplicate group on a fresh call', () => {
      const verse = 'hope hope';
      const duplicated = expectPreserved(verse, [
        frequency('same', 0, 4, 2, 'hope'),
        frequency('same', 0, 4, 2, 'hope'),
      ]);
      const moved = expectPreserved(verse, [frequency('moved', 5, 9, 2, 'hope')]);
      const cleared = expectPreserved(verse, []);

      expect(duplicated.indicators).toEqual([]);
      expect(moved.indicators).toEqual([{ offset: 9, tier: 2, annotationId: 'moved' }]);
      expectSpan(moved, 0, 4, { bold: false, underline: false });
      expectSpan(moved, 5, 9, { bold: false, underline: false, frequencyTier: 2 });
      expect(cleared.indicators).toEqual([]);
      expect(cleared.diagnostics).toEqual([]);
      expect(cleared.runs).toEqual([
        { text: verse, start: 0, end: verse.length, bold: false, underline: false },
      ]);
      expect(duplicated.runs).not.toBe(moved.runs);
    });

    it('keeps distinct annotations that share a phrase, span, tier, or ending offset', () => {
      const repeatedWords = expectPreserved('hope hope', [
        frequency('first', 0, 4, 2, 'hope'),
        frequency('second', 5, 9, 2, 'hope'),
      ]);
      expect(repeatedWords.diagnostics).toEqual([]);
      expect(repeatedWords.indicators).toEqual([
        { offset: 4, tier: 2, annotationId: 'first' },
        { offset: 9, tier: 2, annotationId: 'second' },
      ]);

      const sameSpan = expectPreserved('hope', [
        frequency('a', 0, 4, 2, 'hope'),
        frequency('b', 0, 4, 2, 'hope'),
      ]);
      expect(sameSpan.diagnostics).toEqual([]);
      expect(sameSpan.indicators).toEqual([
        { offset: 4, tier: 2, annotationId: 'a' },
        { offset: 4, tier: 2, annotationId: 'b' },
      ]);
      expectSpan(sameSpan, 0, 4, { bold: false, underline: false, frequencyTier: 2 });

      const missingIds = expectPreserved('hope', [
        annotation({
          type: 'frequency',
          frequencyTier: 3,
          resolvedTarget: { start: 0, end: 4 },
          sourceTarget: { phrase: 'hope' },
        }),
        annotation({
          type: 'frequency',
          frequencyTier: 3,
          resolvedTarget: { start: 0, end: 4 },
          sourceTarget: { phrase: 'hope' },
        }),
      ]);
      expect(missingIds.diagnostics).toEqual([]);
      expect(missingIds.indicators).toEqual([
        { offset: 4, tier: 3 },
        { offset: 4, tier: 3 },
      ]);
    });

    it('keeps legitimate distinct same-tier overlaps', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [frequency('a', 0, 4, 1), frequency('b', 2, 6, 1)]);

      expect(result.diagnostics).toEqual([]);
      expectSpan(result, 0, 6, { bold: false, underline: false, frequencyTier: 1 });
      expect(result.indicators).toEqual([
        { offset: 4, tier: 1, annotationId: 'a' },
        { offset: 6, tier: 1, annotationId: 'b' },
      ]);
      expect(result.runs.map((run) => run.text).join('')).toBe(verse);
    });

    it('keeps different annotation types that share a span', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [
        annotation({
          annotationId: 'beg',
          type: 'uniqueBeginning',
          resolvedTarget: { start: 1, end: 5 },
          sourceTarget: { phrase: 'bcde' },
        }),
        annotation({
          annotationId: 'end',
          type: 'uniqueEnding',
          resolvedTarget: { start: 1, end: 5 },
          sourceTarget: { phrase: 'bcde' },
        }),
        frequency('freq', 1, 5, 4, 'bcde'),
      ]);

      expect(result.diagnostics).toEqual([]);
      expectChar(result, 0, { bold: false, underline: false });
      expectSpan(result, 1, 5, { bold: true, underline: true, frequencyTier: 4 });
      expectChar(result, 5, { bold: false, underline: false });
      expect(result.indicators).toEqual([{ offset: 5, tier: 4, annotationId: 'freq' }]);
      expect(result.canonicalText).toBe(verse);
    });

    it('emits one indicator per frequency annotation that ends at the same offset', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [frequency('outer', 0, 4, 2), frequency('inner', 2, 4, 2)]);

      expect(result.diagnostics).toEqual([]);
      expect(result.indicators).toEqual([
        { offset: 4, tier: 2, annotationId: 'inner' },
        { offset: 4, tier: 2, annotationId: 'outer' },
      ]);
      expectSpan(result, 0, 4, { bold: false, underline: false, frequencyTier: 2 });
      expectSpan(result, 4, 6, { bold: false, underline: false });
      expect(result.runs.map((run) => run.text).join('')).toBe(verse);
    });

    it('still omits both frequencies when distinct ids use conflicting tiers', () => {
      const verse = 'abcdef';
      const result = expectPreserved(verse, [frequency('low', 0, 4, 1), frequency('high', 2, 6, 2)]);

      expect(codes(result)).toEqual(['conflicting_frequency_tiers', 'conflicting_frequency_tiers']);
      expect(result.diagnostics.map((item) => item.annotationId)).toEqual(['low', 'high']);
      expect(result.indicators).toEqual([]);
      expect(result.runs.every((run) => run.frequencyTier === undefined)).toBe(true);
      expect(result.canonicalText).toBe(verse);
    });

    it('preserves canonical scripture characters exactly', () => {
      const verse = ' (Hope — hope.)\n';
      const hope = verse.indexOf('Hope');
      const duplicated = expectPreserved(verse, [
        frequency('same', hope, hope + 4, 2, 'Hope'),
        frequency('same', hope, hope + 4, 4, 'Hope'),
      ]);
      const valid = expectPreserved(verse, [frequency('one', hope, hope + 4, 2, 'Hope')]);
      const cleared = expectPreserved(verse, []);

      for (const result of [duplicated, valid, cleared]) {
        expect(result.canonicalText).toBe(verse);
        expect(result.runs.map((run) => run.text).join('')).toBe(verse);
        for (const run of result.runs) {
          expect(run.text).toBe(verse.slice(run.start, run.end));
        }
      }
      expect(duplicated.indicators).toEqual([]);
      expect(valid.indicators).toEqual([{ offset: hope + 4, tier: 2, annotationId: 'one' }]);
      expect(cleared.indicators).toEqual([]);
      expect(cleared.runs).toEqual([
        { text: verse, start: 0, end: verse.length, bold: false, underline: false },
      ]);
    });
  });
});
