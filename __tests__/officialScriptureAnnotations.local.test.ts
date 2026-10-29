/**
 * @jest-environment node
 *
 * Reads gitignored official workbooks when they are present and checks a small
 * set of cards. Skips when the workbooks are absent. Does not write a package
 * and does not print verse text.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import { buildOfficialSponsorDraft } from '../scripts/content-pipeline/buildOfficialSponsorDraft';
import { leadingPunctuationLength } from '../scripts/content-pipeline/sponsorWordMatch';
import { WPFBQ_2027_SPONSOR_PROFILE } from '../scripts/content-pipeline/sponsorSourceProfile';
import type { ContentAnnotationRecord, ContentCardRecord, ContentMaterialSetRecord, ContentPackage } from '../scripts/content-pipeline/types';
import {
  segmentOfficialAnnotations,
  type OfficialScriptureSegmentation,
} from '../src/shared/scripture/segmentOfficialAnnotations';

const PROVISIONAL_LOCAL_TEST_SEASON_DATES = {
  startDate: '2027-01-01',
  endDate: '2027-08-31',
} as const;

const LOCAL_DIR = path.join('content', 'authoring', 'local');
const WORKBOOKS_PRESENT = WPFBQ_2027_SPONSOR_PROFILE.sources.every((source) =>
  existsSync(path.join(LOCAL_DIR, source.fileName)),
);

const DIVISION_ORDER = ['cadet', 'beginner', 'junior', 'intermediate', 'experienced'] as const;

interface LocatedCard {
  materialSet: ContentMaterialSetRecord;
  card: ContentCardRecord;
}

function identity(materialSet: ContentMaterialSetRecord, card: ContentCardRecord): string {
  return `${materialSet.divisionId} card ${card.cardNumber} ${card.reference}`;
}

function segmentCard(card: ContentCardRecord): OfficialScriptureSegmentation {
  return segmentOfficialAnnotations({
    verseText: card.verseText,
    annotations: card.annotations,
    cardId: card.cardId,
  });
}

function expectExact(materialSet: ContentMaterialSetRecord, card: ContentCardRecord): OfficialScriptureSegmentation {
  const result = segmentCard(card);
  const joined = result.runs.map((run) => run.text).join('');
  const label = identity(materialSet, card);
  if (joined !== card.verseText || result.canonicalText !== card.verseText) {
    throw new Error(
      `${label} concatenation length ${joined.length} canonical length ${result.canonicalText.length} verse length ${card.verseText.length}.`,
    );
  }
  for (const run of result.runs) {
    if (run.text !== card.verseText.slice(run.start, run.end)) {
      throw new Error(`${label} run ${run.start}-${run.end} is not verseText.slice.`);
    }
  }
  if (result.diagnostics.length > 0) {
    throw new Error(
      `${label} diagnostics: ${result.diagnostics.map((item) => `${item.code}${item.annotationId ? `:${item.annotationId}` : ''}`).join(', ')}`,
    );
  }
  return result;
}

function runAt(result: OfficialScriptureSegmentation, index: number) {
  const run = result.runs.find((item) => item.start <= index && index < item.end);
  if (!run) {
    throw new Error(`no run covers offset ${index}`);
  }
  return run;
}

function phraseStarts(text: string, phrase: string): number[] {
  if (phrase.length === 0) {
    return [];
  }
  const starts: number[] = [];
  let from = 0;
  while (from < text.length) {
    const index = text.indexOf(phrase, from);
    if (index === -1) {
      break;
    }
    starts.push(index);
    from = index + 1;
  }
  return starts;
}

function spansOverlap(
  left: { start: number; end: number },
  right: { start: number; end: number },
): boolean {
  return left.start < right.end && right.start < left.end;
}

(WORKBOOKS_PRESENT ? describe : describe.skip)('local official scripture annotation rendering', () => {
  jest.setTimeout(180000);

  let content: ContentPackage;

  beforeAll(async () => {
    const draft = await buildOfficialSponsorDraft({
      directory: LOCAL_DIR,
      seasonDates: PROVISIONAL_LOCAL_TEST_SEASON_DATES,
    });
    if (draft.status !== 'passed' || draft.pipeline.content === undefined) {
      throw new Error(`official draft status ${draft.status}`);
    }
    content = draft.pipeline.content;
  }, 180000);

  function materialSet(divisionId: (typeof DIVISION_ORDER)[number]): ContentMaterialSetRecord {
    const found = content.materialSets.find((item) => item.divisionId === divisionId);
    if (!found) {
      throw new Error(`missing material set ${divisionId}`);
    }
    return found;
  }

  function requireLocated(found: LocatedCard | undefined, caseName: string): LocatedCard {
    if (!found) {
      throw new Error(`no official card matched ${caseName}`);
    }
    return found;
  }

  it('preserves cadet verses whose unique ending phrase is repeated', () => {
    const cadet = materialSet('cadet');
    const cards = cadet.cards.filter((card) =>
      card.annotations.some(
        (item) => item.type === 'uniqueEnding' && item.sourceTarget.occurrenceIndex > 1,
      ),
    );
    expect(
      cards
        .map((card) => ({ cardNumber: card.cardNumber, reference: card.reference }))
        .sort((left, right) => left.cardNumber - right.cardNumber),
    ).toEqual([
      { cardNumber: 4, reference: 'Ephesians 6:13' },
      { cardNumber: 16, reference: '2 Corinthians 10:3' },
      { cardNumber: 49, reference: 'Psalm 56:10' },
    ]);

    for (const card of cards) {
      const ending = card.annotations.find((item) => item.type === 'uniqueEnding');
      if (!ending) {
        throw new Error(`${identity(cadet, card)} has no unique ending`);
      }
      const phrase = ending.sourceTarget.phrase;
      const { start, end } = ending.resolvedTarget;
      const result = expectExact(cadet, card);
      if (end - start !== phrase.length) {
        throw new Error(`${identity(cadet, card)} unique ending span length ${end - start} phrase length ${phrase.length}`);
      }
      for (let index = start; index < end; index += 1) {
        expect(runAt(result, index).underline).toBe(true);
      }
      const others = phraseStarts(card.verseText, phrase).filter((index) => index !== start);
      expect(others.length).toBeGreaterThan(0);
      for (const other of others) {
        for (let index = other; index < other + phrase.length; index += 1) {
          if (index >= start && index < end) {
            continue;
          }
          expect(runAt(result, index).underline).toBe(false);
        }
      }
      expect(result.indicators.length).toBe(
        card.annotations.filter((item) => item.type === 'frequency').length,
      );
    }
  });

  it('preserves a frequency word inside a unique beginning and inside a unique ending', () => {
    const contained = (boundaryType: 'uniqueBeginning' | 'uniqueEnding') => {
      for (const divisionId of DIVISION_ORDER) {
        const set = materialSet(divisionId);
        for (const card of set.cards) {
          const boundary = card.annotations.find((item) => item.type === boundaryType);
          if (!boundary) {
            continue;
          }
          const frequency = card.annotations.find((item) => {
            if (item.type !== 'frequency' || item.frequencyTier === undefined) {
              return false;
            }
            const inner = item.resolvedTarget;
            const outer = boundary.resolvedTarget;
            const strictlyInside =
              inner.start >= outer.start &&
              inner.end <= outer.end &&
              (inner.start > outer.start || inner.end < outer.end);
            if (!strictlyInside) {
              return false;
            }
            const conflicts = card.annotations.some(
              (other) =>
                other !== item &&
                other.type === 'frequency' &&
                other.frequencyTier !== item.frequencyTier &&
                spansOverlap(other.resolvedTarget, inner),
            );
            if (conflicts) {
              return false;
            }
            const outsideIndex = inner.start > outer.start ? inner.start - 1 : inner.end;
            const outsideInBoundary = outsideIndex >= outer.start && outsideIndex < outer.end;
            const outsideCovered = card.annotations.some(
              (other) =>
                other.type === 'frequency' &&
                other.resolvedTarget.start <= outsideIndex &&
                outsideIndex < other.resolvedTarget.end,
            );
            return outsideInBoundary && !outsideCovered;
          });
          if (frequency) {
            return { materialSet: set, card, boundary, frequency };
          }
        }
      }
      return undefined;
    };

    for (const boundaryType of ['uniqueBeginning', 'uniqueEnding'] as const) {
      const found = contained(boundaryType);
      if (!found) {
        throw new Error(`no official card matched frequency inside ${boundaryType}`);
      }
      const result = expectExact(found.materialSet, found.card);
      const { start, end } = found.frequency.resolvedTarget;
      for (let index = start; index < end; index += 1) {
        const run = runAt(result, index);
        expect(run.frequencyTier).toBe(found.frequency.frequencyTier);
        if (boundaryType === 'uniqueBeginning') {
          expect(run.bold).toBe(true);
        } else {
          expect(run.underline).toBe(true);
        }
      }
      const outsideIndex =
        start > found.boundary.resolvedTarget.start ? start - 1 : end;
      const outside = runAt(result, outsideIndex);
      expect(outside.frequencyTier).toBeUndefined();
      if (boundaryType === 'uniqueBeginning') {
        expect(outside.bold).toBe(true);
      } else {
        expect(outside.underline).toBe(true);
      }
      const indicator = result.indicators.find(
        (item) => item.offset === end && item.tier === found.frequency.frequencyTier,
      );
      expect(indicator).toBeDefined();
      expect(identity(found.materialSet, found.card)).toBe(
        boundaryType === 'uniqueBeginning'
          ? 'cadet card 3 Ephesians 6:12'
          : 'cadet card 15 Romans 8:14',
      );
    }
  });

  it('preserves a card with several frequency annotations', () => {
    let found: (LocatedCard & { frequencies: ContentAnnotationRecord[] }) | undefined;
    for (const divisionId of DIVISION_ORDER) {
      const set = materialSet(divisionId);
      for (const card of set.cards) {
        const frequencies = card.annotations.filter(
          (item) => item.type === 'frequency' && item.frequencyTier !== undefined,
        );
        if (frequencies.length < 2) {
          continue;
        }
        const overlaps = frequencies.some((left, index) =>
          frequencies.slice(index + 1).some((right) => spansOverlap(left.resolvedTarget, right.resolvedTarget)),
        );
        if (!overlaps) {
          found = { materialSet: set, card, frequencies };
          break;
        }
      }
      if (found) {
        break;
      }
    }
    const selected = found ?? (() => {
      throw new Error('no official card matched multiple non-overlapping frequency annotations');
    })();
    const result = expectExact(selected.materialSet, selected.card);
    expect(result.indicators.map((item) => `${item.tier}@${item.offset}`).sort()).toEqual(
      selected.frequencies.map((item) => `${item.frequencyTier}@${item.resolvedTarget.end}`).sort(),
    );
    for (const frequency of selected.frequencies) {
      for (let index = frequency.resolvedTarget.start; index < frequency.resolvedTarget.end; index += 1) {
        expect(runAt(result, index).frequencyTier).toBe(frequency.frequencyTier);
      }
    }
    expect(identity(selected.materialSet, selected.card)).toBe('cadet card 1 Ephesians 6:10');
    expect(selected.frequencies).toHaveLength(4);
  });

  it('preserves one example of each frequency tier', () => {
    for (const tier of [1, 2, 3, 4, 5] as const) {
      let found: (LocatedCard & { annotation: ContentAnnotationRecord }) | undefined;
      for (const divisionId of DIVISION_ORDER) {
        const set = materialSet(divisionId);
        for (const card of set.cards) {
          const annotation = card.annotations.find(
            (item) => item.type === 'frequency' && item.frequencyTier === tier,
          );
          if (annotation) {
            found = { materialSet: set, card, annotation };
            break;
          }
        }
        if (found) {
          break;
        }
      }
      if (!found) {
        throw new Error(`no official card matched frequency tier ${tier}`);
      }
      const result = expectExact(found.materialSet, found.card);
      const { start, end } = found.annotation.resolvedTarget;
      for (let index = start; index < end; index += 1) {
        expect(runAt(result, index).frequencyTier).toBe(tier);
      }
      expect(result.indicators.some((item) => item.offset === end && item.tier === tier)).toBe(true);
      const tierCard: Record<(typeof tier), string> = {
        1: 'cadet card 1 Ephesians 6:10',
        2: 'junior card 2 Ephesians 6:11',
        3: 'junior card 2 Ephesians 6:11',
        4: 'intermediate card 2 Ephesians 6:11',
        5: 'intermediate card 4 Ephesians 6:13',
      };
      expect(identity(found.materialSet, found.card)).toBe(tierCard[tier]);
    }
  });

  it('keeps leading punctuation outside the cadet unique beginning', () => {
    const cadet = materialSet('cadet');
    const card = cadet.cards.find((item) => item.reference === '2 Corinthians 5:7');
    if (!card) {
      throw new Error('cadet card 2 Corinthians 5:7 was not loaded');
    }
    const beginning = card.annotations.find((item) => item.type === 'uniqueBeginning');
    if (!beginning) {
      throw new Error('cadet 2 Corinthians 5:7 has no unique beginning');
    }
    const lead = leadingPunctuationLength(card.verseText);
    expect(card.cardNumber).toBe(38);
    expect(lead).toBeGreaterThan(0);
    expect(beginning.resolvedTarget.start).toBe(lead);
    const result = expectExact(cadet, card);
    expect(runAt(result, lead - 1).bold).toBe(false);
    for (let index = beginning.resolvedTarget.start; index < beginning.resolvedTarget.end; index += 1) {
      expect(runAt(result, index).bold).toBe(true);
    }
  });

  it('preserves the longest loaded verse', () => {
    let found: LocatedCard | undefined;
    for (const divisionId of DIVISION_ORDER) {
      const set = materialSet(divisionId);
      for (const card of set.cards) {
        if (!found || card.verseText.length > found.card.verseText.length) {
          found = { materialSet: set, card };
        }
      }
    }
    const selected = requireLocated(found, 'long verse');
    const cadet = materialSet('cadet');
    const shortCard = cadet.cards.find((item) => item.reference === '2 Corinthians 5:7');
    if (!shortCard) {
      throw new Error('cadet card 2 Corinthians 5:7 was not loaded');
    }
    expect(identity(selected.materialSet, selected.card)).toBe('intermediate card 114 Joshua 23:14');
    expect(selected.card.verseText.length).toBeGreaterThan(shortCard.verseText.length);
    expectExact(selected.materialSet, selected.card);
  });

  it('does not leak run state between two material sets that share a reference', () => {
    const intermediate = materialSet('intermediate');
    const experienced = materialSet('experienced');
    const left = intermediate.cards.find((card) =>
      experienced.cards.some((other) => other.reference === card.reference),
    );
    if (!left) {
      throw new Error('no shared reference across intermediate and experienced');
    }
    const right = experienced.cards.find((card) => card.reference === left.reference);
    if (!right) {
      throw new Error(`experienced is missing ${left.reference}`);
    }
    const leftResult = expectExact(intermediate, left);
    const rightResult = expectExact(experienced, right);
    expect(leftResult.runs).not.toBe(rightResult.runs);
    const rightLength = rightResult.runs[0]?.text.length ?? 0;
    if (leftResult.runs[0]) {
      leftResult.runs[0].text = 'changed';
    }
    expect(rightResult.runs[0]?.text.length).toBe(rightLength);
    expect(rightResult.runs[0]?.text === 'changed').toBe(false);
    const again = segmentCard(right);
    expect(again.runs.map((run) => run.text).join('') === right.verseText).toBe(true);
    expect(left.cardNumber).toBe(1);
    expect(right.cardNumber).toBe(1);
    expect(left.reference).toBe('Ephesians 6:10');
    expect(right.reference).toBe('Ephesians 6:10');
  });
});
