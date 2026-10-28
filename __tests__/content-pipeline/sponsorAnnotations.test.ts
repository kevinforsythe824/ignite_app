/**
 * @jest-environment node
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { buildOfficialSponsorDraft } from '../../scripts/content-pipeline/buildOfficialSponsorDraft';
import { generateSponsorAnnotations } from '../../scripts/content-pipeline/generateSponsorAnnotations';
import { stablePrettyJson } from '../../scripts/content-pipeline/fingerprint';
import { mapSponsorVerseListToWorkbooks } from '../../scripts/content-pipeline/mapSponsorVerseList';
import { official2027DraftSeason } from '../../scripts/content-pipeline/officialDraftPackage';
import { runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import { resolveAnnotationTarget } from '../../scripts/content-pipeline/resolveAnnotationTarget';
import {
  SPONSOR_FREQUENCY_SHEET,
  type SponsorFrequencyEntry,
  type SponsorFrequencyWords,
} from '../../scripts/content-pipeline/sponsorFrequencyTypes';
import type { SponsorMaterialSetTarget, SponsorSourceProfile } from '../../scripts/content-pipeline/sponsorSourceProfile';
import {
  SPONSOR_VERSE_LIST_COLUMNS,
  SPONSOR_VERSE_LIST_SHEET,
  type SponsorVerseList,
  type SponsorVerseListRow,
} from '../../scripts/content-pipeline/sponsorSourceTypes';
import { loadValidatedContentPackage } from '../../scripts/content-import/loadPackage';
import { validateContentPackage } from '../../scripts/content-pipeline/validatePackage';
import type { AnnotationRow } from '../../scripts/content-pipeline/types';

const RULES_VERSION = '1.0 (2026-07-29)';
const SEASON_DATES = { startDate: '2027-01-01', endDate: '2027-08-31' } as const;

const SENIOR_TARGETS: readonly SponsorMaterialSetTarget[] = [
  { divisionId: 'intermediate', materialSetId: 'intermediate-2027' },
  { divisionId: 'experienced', materialSetId: 'experienced-2027' },
];

function season() {
  const resolved = official2027DraftSeason(RULES_VERSION, SEASON_DATES);
  if (!resolved.ok) {
    throw new Error(resolved.errors.map((item) => item.reason).join('\n'));
  }
  return resolved.season;
}

function verseRow(overrides: Partial<SponsorVerseListRow> = {}): SponsorVerseListRow {
  return {
    sourceRow: 2,
    seq: 1,
    section: 'Opening',
    reference: 'Sample 1:1',
    verseText: '(He saw the hope and hope.)',
    uniqueBeginning: 'He',
    uniqueEnding: 'hope',
    ...overrides,
  };
}

function verseList(rows: readonly SponsorVerseListRow[] = [verseRow()]): SponsorVerseList {
  return {
    workbookName: 'fixture.xlsx',
    sheetName: SPONSOR_VERSE_LIST_SHEET,
    rows,
    sections: [...new Set(rows.map((row) => row.section))],
  };
}

function frequencyEntry(overrides: Partial<SponsorFrequencyEntry> = {}): SponsorFrequencyEntry {
  return {
    sourceRow: 2,
    word: 'hope',
    tier: 1,
    verses: 1,
    occurrences: 2,
    repeatsInVerse: true,
    references: ['Sample 1:1'],
    ...overrides,
  };
}

function frequencyWords(entries: readonly SponsorFrequencyEntry[]): SponsorFrequencyWords {
  return {
    workbookName: 'fixture.xlsx',
    sheetName: SPONSOR_FREQUENCY_SHEET,
    entries,
  };
}

function annotationsFor(result: ReturnType<typeof generateSponsorAnnotations>, cardNumber = 1): readonly AnnotationRow[] {
  if (!result.ok) {
    throw new Error(result.errors.map((item) => `${item.code} ${item.sheet ?? ''} ${item.field ?? ''}: ${item.reason}`).join('\n'));
  }
  return result.annotationsByCardNumber.get(cardNumber) ?? [];
}

describe('sponsor annotation generation', () => {
  it('targets an opening unique beginning and the final repeated unique ending', () => {
    const row = verseRow();
    const annotations = annotationsFor(
      generateSponsorAnnotations({
        verseList: verseList([row]),
        frequencyWords: frequencyWords([
          frequencyEntry(),
          frequencyEntry({
            sourceRow: 3,
            word: 'he',
            occurrences: 1,
            repeatsInVerse: false,
          }),
        ]),
      }),
    );

    const beginning = annotations.find((annotation) => annotation.type === 'uniqueBeginning');
    const ending = annotations.find((annotation) => annotation.type === 'uniqueEnding');
    expect(beginning).toMatchObject({ phrase: 'He', occurrenceIndex: 1 });
    expect(beginning).not.toHaveProperty('frequencyTier');
    expect(row.verseText.slice(1, 3)).toBe('He');
    expect(ending).toMatchObject({ phrase: 'hope', occurrenceIndex: 2 });
    expect(ending).not.toHaveProperty('frequencyTier');

    const hope = annotations.filter((annotation) => annotation.type === 'frequency' && annotation.phrase === 'hope');
    expect(hope.map((annotation) => annotation.occurrenceIndex)).toEqual([1, 2]);
    expect(hope.every((annotation) => annotation.frequencyTier === 1)).toBe(true);
    const he = annotations.filter((annotation) => annotation.type === 'frequency' && annotation.phrase === 'He');
    expect(he).toEqual([expect.objectContaining({ occurrenceIndex: 1, frequencyTier: 1 })]);
    expect(annotations.some((annotation) => annotation.phrase === 'the' || annotation.phrase === 'he')).toBe(false);

    for (const annotation of annotations) {
      expect(annotation.phrase).toBeDefined();
      const phrase = annotation.phrase ?? '';
      const resolved = resolveAnnotationTarget({
        verseText: row.verseText,
        sourceTarget: {
          strategy: 'phraseOccurrence',
          phrase,
          occurrenceIndex: annotation.occurrenceIndex,
        },
      });
      expect(resolved.error).toBeUndefined();
      expect(row.verseText.slice(resolved.resolved?.start ?? 0, resolved.resolved?.end ?? 0)).toBe(phrase);
    }
    expect(row.verseText).toBe('(He saw the hope and hope.)');
  });

  it('keeps separate occurrence indexes when a repeated word changes case', () => {
    const row = verseRow({
      verseText: 'Hope and hope.',
      uniqueBeginning: 'Hope',
      uniqueEnding: 'hope',
    });
    const annotations = annotationsFor(
      generateSponsorAnnotations({
        verseList: verseList([row]),
        frequencyWords: frequencyWords([frequencyEntry({ word: 'hope' })]),
      }),
    );
    const frequency = annotations.filter((annotation) => annotation.type === 'frequency');
    expect(frequency.map((annotation) => [annotation.phrase, annotation.occurrenceIndex])).toEqual([
      ['Hope', 1],
      ['hope', 1],
    ]);
  });

  it('stores the original apostrophe and skips substring frequency matches', () => {
    const row = verseRow({
      verseText: 'See the joint-heirs and the Lord’s heirs.',
      uniqueBeginning: 'See',
      uniqueEnding: 'heirs',
      reference: 'Sample 2:2',
    });
    const annotations = annotationsFor(
      generateSponsorAnnotations({
        verseList: verseList([row]),
        frequencyWords: frequencyWords([
          frequencyEntry({
            word: "lord's",
            occurrences: 1,
            repeatsInVerse: false,
            references: ['Sample 2:2'],
          }),
          frequencyEntry({
            sourceRow: 3,
            word: 'heirs',
            occurrences: 1,
            repeatsInVerse: false,
            references: ['Sample 2:2'],
          }),
        ]),
      }),
    );
    expect(annotations.find((annotation) => annotation.type === 'frequency' && annotation.frequencyTier === 1 && annotation.phrase === 'Lord’s')).toMatchObject({
      occurrenceIndex: 1,
    });
    expect(annotations.filter((annotation) => annotation.type === 'frequency' && annotation.phrase === 'heirs')).toHaveLength(1);
    expect(annotations.some((annotation) => annotation.phrase === 'joint-heirs' && annotation.type === 'frequency')).toBe(false);

    const missing = generateSponsorAnnotations({
      verseList: verseList([row]),
      frequencyWords: frequencyWords([
        frequencyEntry({
          word: 'he',
          occurrences: 1,
          repeatsInVerse: false,
          references: ['Sample 2:2'],
        }),
      ]),
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'frequency_word_not_in_verse',
            sheet: SPONSOR_FREQUENCY_SHEET,
            field: 'Word',
            row: 2,
          }),
        ]),
      );
    }
  });

  it('omits a blank unique phrase and fails when a non-blank phrase cannot be targeted', () => {
    const blank = annotationsFor(
      generateSponsorAnnotations({
        verseList: verseList([verseRow({ uniqueBeginning: undefined })]),
        frequencyWords: frequencyWords([]),
      }),
    );
    expect(blank.some((annotation) => annotation.type === 'uniqueBeginning')).toBe(false);
    expect(blank.some((annotation) => annotation.type === 'uniqueEnding')).toBe(true);

    const unresolved = generateSponsorAnnotations({
      verseList: verseList([verseRow({ uniqueBeginning: 'Missing' })]),
      frequencyWords: frequencyWords([]),
    });
    expect(unresolved.ok).toBe(false);
    if (!unresolved.ok) {
      expect(unresolved.errors[0]).toMatchObject({
        code: 'unresolved_phrase_target',
        workbook: 'fixture.xlsx',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        row: 2,
        field: 'Unique Beginning',
      });
    }

    const misplaced = generateSponsorAnnotations({
      verseList: verseList([
        verseRow({ verseText: 'Say He now.', uniqueBeginning: 'He', uniqueEnding: 'now' }),
      ]),
      frequencyWords: frequencyWords([]),
    });
    expect(misplaced.ok).toBe(false);
    if (!misplaced.ok) {
      expect(misplaced.errors[0]).toMatchObject({
        code: 'unique_beginning_position',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        field: 'Unique Beginning',
      });
    }

    const earlyEnding = generateSponsorAnnotations({
      verseList: verseList([
        verseRow({ verseText: 'hope and more.', uniqueBeginning: 'hope', uniqueEnding: 'hope' }),
      ]),
      frequencyWords: frequencyWords([]),
    });
    expect(earlyEnding.ok).toBe(false);
    if (!earlyEnding.ok) {
      expect(earlyEnding.errors[0]).toMatchObject({
        code: 'unique_ending_position',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        field: 'Unique Ending',
        row: 2,
      });
    }
  });

  it('fails closed when a unique beginning occurs more than once', () => {
    const repeated = generateSponsorAnnotations({
      verseList: verseList([
        verseRow({ verseText: 'Hope and Hope.', uniqueBeginning: 'Hope', uniqueEnding: 'Hope' }),
      ]),
      frequencyWords: frequencyWords([]),
    });
    expect(repeated.ok).toBe(false);
    if (!repeated.ok) {
      expect(repeated.errors[0]).toMatchObject({
        code: 'repeated_unique_beginning',
        sheet: SPONSOR_VERSE_LIST_SHEET,
        field: 'Unique Beginning',
        row: 2,
      });
    }
  });

  it('fails closed when a whole-word span is not an exact phrase occurrence', () => {
    const gap = generateSponsorAnnotations({
      verseList: verseList([
        verseRow({
          verseText: 'a a a',
          uniqueBeginning: undefined,
          uniqueEnding: undefined,
        }),
      ]),
      frequencyWords: frequencyWords([
        frequencyEntry({ word: 'a a', occurrences: 2, repeatsInVerse: true }),
      ]),
    });
    expect(gap.ok).toBe(false);
    if (!gap.ok) {
      expect(gap.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'frequency_target_mismatch',
            sheet: SPONSOR_FREQUENCY_SHEET,
            field: 'Word',
            row: 2,
          }),
        ]),
      );
    }
  });

  it('fails closed when a frequency reference or occurrence count does not match the verse list', () => {
    const missingReference = generateSponsorAnnotations({
      verseList: verseList(),
      frequencyWords: frequencyWords([
        frequencyEntry({ references: ['Missing 9:9'], occurrences: 1, repeatsInVerse: false }),
      ]),
    });
    expect(missingReference.ok).toBe(false);
    if (!missingReference.ok) {
      expect(missingReference.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unresolved_frequency_reference',
            sheet: SPONSOR_FREQUENCY_SHEET,
            field: 'References',
            row: 2,
          }),
        ]),
      );
    }

    const countMismatch = generateSponsorAnnotations({
      verseList: verseList([verseRow({ verseText: 'hope.', uniqueBeginning: 'hope', uniqueEnding: 'hope' })]),
      frequencyWords: frequencyWords([frequencyEntry({ occurrences: 2 })]),
    });
    expect(countMismatch.ok).toBe(false);
    if (!countMismatch.ok) {
      expect(countMismatch.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'frequency_occurrence_mismatch',
            sheet: SPONSOR_FREQUENCY_SHEET,
            field: 'Occurrences',
            row: 2,
          }),
        ]),
      );
    }
  });

  it('clones Senior annotations into independent MaterialSets', () => {
    const generated = generateSponsorAnnotations({
      verseList: verseList(),
      frequencyWords: frequencyWords([frequencyEntry()]),
    });
    if (!generated.ok) {
      throw new Error(generated.errors.map((item) => item.reason).join('\n'));
    }
    const mapped = mapSponsorVerseListToWorkbooks({
      verseList: verseList(),
      materialSets: SENIOR_TARGETS,
      season: season(),
      annotationsByCardNumber: generated.annotationsByCardNumber,
    });
    if (!mapped.ok) {
      throw new Error(mapped.errors.map((item) => item.reason).join('\n'));
    }
    const [intermediate, experienced] = mapped.workbooks;
    const left = intermediate?.annotations ?? [];
    const right = experienced?.annotations ?? [];
    expect(left).toEqual(right);
    expect(left).not.toBe(right);
    expect(left.length).toBeGreaterThan(0);
    left.forEach((annotation, index) => {
      expect(annotation).not.toBe(right[index]);
    });

    const pipeline = runPipelineFromWorkbooks(mapped.workbooks, { requireAllOfficialDivisions: false });
    expect(pipeline.status).toBe('passed');
    expect(pipeline.report.errors).toEqual([]);
    const contentLeft = pipeline.content?.materialSets.find((materialSet) => materialSet.materialSetId === 'intermediate-2027');
    const contentRight = pipeline.content?.materialSets.find((materialSet) => materialSet.materialSetId === 'experienced-2027');
    const leftCard = contentLeft?.cards[0];
    const rightCard = contentRight?.cards[0];
    if (!leftCard || !rightCard) {
      throw new Error('expected both Senior cards');
    }
    expect(leftCard.annotations).toEqual(rightCard.annotations);
    expect(leftCard.annotations[0]).not.toBe(rightCard.annotations[0]);
    expect(leftCard.annotations[0]?.sourceTarget).not.toBe(rightCard.annotations[0]?.sourceTarget);
    expect(leftCard.verseText).toBe('(He saw the hope and hope.)');
    for (const annotation of leftCard.annotations) {
      expect(leftCard.verseText.slice(annotation.resolvedTarget.start, annotation.resolvedTarget.end)).toBe(
        annotation.sourceTarget.phrase,
      );
      if (annotation.type === 'frequency') {
        expect(annotation.frequencyTier).toBe(1);
      } else {
        expect(annotation.frequencyTier).toBeUndefined();
      }
    }
    const saved = rightCard.annotations[0]?.sourceTarget.phrase;
    if (leftCard.annotations[0]) {
      leftCard.annotations[0].sourceTarget.phrase = 'mutated content';
    }
    expect(rightCard.annotations[0]?.sourceTarget.phrase).toBe(saved);

    const original = right[0]?.phrase;
    if (left[0]) {
      left[0].phrase = 'mutated';
    }
    expect(right[0]?.phrase).toBe(original);
    expect(generated.annotationsByCardNumber.get(1)?.[0]?.phrase).not.toBe('mutated');
  });

  it('selects the later unique ending and leaves surrounding punctuation outside the phrase', () => {
    const row = verseRow({
      verseText: 'stand firm and stand."',
      uniqueBeginning: 'stand firm',
      uniqueEnding: 'stand',
    });
    const annotations = annotationsFor(
      generateSponsorAnnotations({
        verseList: verseList([row]),
        frequencyWords: frequencyWords([]),
      }),
    );
    const ending = annotations.find((annotation) => annotation.type === 'uniqueEnding');
    expect(ending).toMatchObject({ phrase: 'stand', occurrenceIndex: 2 });
    const resolved = resolveAnnotationTarget({
      verseText: row.verseText,
      sourceTarget: { strategy: 'phraseOccurrence', phrase: 'stand', occurrenceIndex: 2 },
    });
    expect(row.verseText.slice(resolved.resolved?.start ?? 0, resolved.resolved?.end ?? 0)).toBe('stand');
    expect(resolved.resolved?.start).toBe(row.verseText.lastIndexOf('stand'));
    expect(row.verseText.slice(0, 'stand'.length)).toBe('stand');
    expect(resolved.resolved?.start).not.toBe(0);

    const parenthetical = verseRow({
      verseText: '(For we walk by faith.)',
      uniqueBeginning: 'For we walk',
      uniqueEnding: 'faith',
      reference: 'Sample 3:3',
    });
    const kept = annotationsFor(
      generateSponsorAnnotations({
        verseList: verseList([parenthetical]),
        frequencyWords: frequencyWords([]),
      }),
    );
    expect(kept.find((annotation) => annotation.type === 'uniqueBeginning')).toMatchObject({
      phrase: 'For we walk',
      occurrenceIndex: 1,
    });
    expect(parenthetical.verseText.startsWith('(')).toBe(true);
    expect(kept.some((annotation) => annotation.phrase?.includes('('))).toBe(false);

    const included = generateSponsorAnnotations({
      verseList: verseList([
        verseRow({
          verseText: '(For we walk by faith.)',
          uniqueBeginning: '(For we walk',
          uniqueEnding: 'faith',
        }),
      ]),
      frequencyWords: frequencyWords([]),
    });
    expect(included.ok).toBe(false);
    if (!included.ok) {
      expect(included.errors[0]).toMatchObject({
        code: 'unique_beginning_position',
        field: 'Unique Beginning',
        row: 2,
      });
      expect(included.errors[0]?.reason).toContain('(For we walk');
    }
  });

  it('fails closed on a duplicate logical annotation without emitting both', () => {
    const duplicated = generateSponsorAnnotations({
      verseList: verseList(),
      frequencyWords: frequencyWords([
        frequencyEntry(),
        frequencyEntry({ sourceRow: 4, word: 'Hope' }),
      ]),
    });
    expect(duplicated.ok).toBe(false);
    if (!duplicated.ok) {
      expect(duplicated.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'duplicate_annotation',
            sheet: SPONSOR_FREQUENCY_SHEET,
            row: 4,
            field: 'Word',
          }),
        ]),
      );
    }

    const generated = generateSponsorAnnotations({
      verseList: verseList(),
      frequencyWords: frequencyWords([frequencyEntry()]),
    });
    if (!generated.ok) {
      throw new Error(generated.errors.map((item) => item.reason).join('\n'));
    }
    const mapped = mapSponsorVerseListToWorkbooks({
      verseList: verseList(),
      materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
      season: season(),
      annotationsByCardNumber: generated.annotationsByCardNumber,
    });
    if (!mapped.ok) {
      throw new Error(mapped.errors.map((item) => item.reason).join('\n'));
    }
    const workbook = mapped.workbooks[0];
    const original = workbook?.annotations.find((annotation) => annotation.type === 'frequency');
    if (!workbook || !original) {
      throw new Error('expected a frequency annotation');
    }
    workbook.annotations.push({ ...original, frequencyTier: 2 });
    const pipeline = runPipelineFromWorkbooks([workbook], { requireAllOfficialDivisions: false });
    expect(pipeline.status).toBe('failed');
    expect(pipeline.content).toBeUndefined();
    expect(pipeline.report.errors.some((item) => item.code === 'duplicate_annotation')).toBe(true);
  });

  it('fails closed when a reference cannot identify one Verse List card', () => {
    const ambiguous = generateSponsorAnnotations({
      verseList: verseList([
        verseRow({ seq: 1, sourceRow: 2, reference: '1 John 1:1' }),
        verseRow({
          seq: 2,
          sourceRow: 3,
          reference: '1 John 1:1',
          section: 'Later',
          verseText: 'Another hope.',
          uniqueBeginning: 'Another',
          uniqueEnding: 'hope',
        }),
      ]),
      frequencyWords: frequencyWords([
        frequencyEntry({ references: ['1 John 1:1'], occurrences: 1, repeatsInVerse: false }),
      ]),
    });
    expect(ambiguous.ok).toBe(false);
    if (!ambiguous.ok) {
      expect(ambiguous.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'duplicate_reference',
            sheet: SPONSOR_VERSE_LIST_SHEET,
            row: 3,
            field: 'Reference',
          }),
        ]),
      );
    }

    const nearMiss = generateSponsorAnnotations({
      verseList: verseList([verseRow({ reference: '1 John 1:1' })]),
      frequencyWords: frequencyWords([
        frequencyEntry({ references: ['John 1:1'], occurrences: 1, repeatsInVerse: false }),
      ]),
    });
    expect(nearMiss.ok).toBe(false);
    if (!nearMiss.ok) {
      expect(nearMiss.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'unresolved_frequency_reference',
            sheet: SPONSOR_FREQUENCY_SHEET,
            row: 2,
            field: 'References',
          }),
        ]),
      );
      expect(nearMiss.errors.some((item) => item.reason.includes('John 1:1'))).toBe(true);
    }

    const generated = generateSponsorAnnotations({
      verseList: verseList(),
      frequencyWords: frequencyWords([]),
    });
    if (!generated.ok) {
      throw new Error(generated.errors.map((item) => item.reason).join('\n'));
    }
    const annotations = new Map(generated.annotationsByCardNumber);
    const sample = annotations.get(1)?.[0];
    if (!sample) {
      throw new Error('expected a boundary annotation');
    }
    annotations.set(99, [{ ...sample, cardNumber: 99 }]);
    const mapped = mapSponsorVerseListToWorkbooks({
      verseList: verseList(),
      materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
      season: season(),
      annotationsByCardNumber: annotations,
    });
    expect(mapped.ok).toBe(false);
    if (!mapped.ok) {
      expect(mapped.errors).toEqual([
        expect.objectContaining({
          code: 'unknown_annotation_card',
          field: 'cardNumber',
          workbook: 'fixture.xlsx',
        }),
      ]);
      expect(mapped.errors[0]?.reason).toContain('99');
    }
  });

  it('does not associate an official workbook with another division', async () => {
    const mismatched = await buildOfficialSponsorDraft({
      directory: os.tmpdir(),
      profile: {
        seasonId: '2027',
        sources: [
          {
            sourceId: 'beginner',
            fileName: 'nested/WPFBQ_2027_Junior_Data_Workbook.xlsx',
            materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
          },
        ],
      },
      seasonDates: SEASON_DATES,
    });
    expect(mismatched.status).toBe('failed');
    expect(mismatched.workbookReadCount).toBe(0);
    expect(mismatched.pipeline.content).toBeUndefined();
    expect(mismatched.pipeline.report.errors).toEqual([
      expect.objectContaining({
        code: 'workbook_division_mismatch',
        workbook: 'WPFBQ_2027_Junior_Data_Workbook.xlsx',
        field: 'divisionId',
      }),
    ]);

    const unauthorized = await buildOfficialSponsorDraft({
      directory: os.tmpdir(),
      profile: {
        seasonId: '2027',
        sources: [
          {
            sourceId: 'elite',
            fileName: 'WPFBQ_2027_Elite_Data_Workbook.xlsx',
            materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
          },
        ],
      },
      seasonDates: SEASON_DATES,
    });
    expect(unauthorized.pipeline.report.errors).toEqual([
      expect.objectContaining({
        code: 'unrecognized_sponsor_workbook',
        workbook: 'WPFBQ_2027_Elite_Data_Workbook.xlsx',
        field: 'fileName',
      }),
    ]);

    const wrongMaterialSet = await buildOfficialSponsorDraft({
      directory: os.tmpdir(),
      profile: {
        seasonId: '2027',
        sources: [
          {
            sourceId: 'beginner',
            fileName: 'WPFBQ_2027_Beginner_Data_Workbook.xlsx',
            materialSets: [{ divisionId: 'beginner', materialSetId: 'junior-2027' }],
          },
        ],
      },
      seasonDates: SEASON_DATES,
    });
    expect(wrongMaterialSet.pipeline.report.errors).toEqual([
      expect.objectContaining({
        code: 'workbook_division_mismatch',
        field: 'materialSetId',
        workbook: 'WPFBQ_2027_Beginner_Data_Workbook.xlsx',
      }),
    ]);

    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-slice-c-name-'));
    try {
      await writeDraftWorkbook(directory, 'WPFBQ_2027_Beginner_Data_Workbook.xlsx');
      const prefixed = await buildOfficialSponsorDraft({
        directory,
        profile: {
          seasonId: '2027',
          sources: [
            {
              sourceId: 'beginner',
              fileName: 'nested/WPFBQ_2027_Beginner_Data_Workbook.xlsx',
              materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
            },
          ],
        },
        seasonDates: SEASON_DATES,
      });
      expect(prefixed.status).toBe('passed');
      expect(prefixed.pipeline.content?.materialSets.map((materialSet) => materialSet.materialSetId)).toEqual([
        'beginner-2027',
      ]);
      expect(prefixed.pipeline.content?.season).not.toHaveProperty('igniteAvailabilityDate');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects an official file whose summary names another division', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-slice-c-corpus-'));
    try {
      await writeDraftWorkbook(directory, 'WPFBQ_2027_Beginner_Data_Workbook.xlsx');
      const workbook = new ExcelJS.Workbook();
      const filePath = path.join(directory, 'WPFBQ_2027_Beginner_Data_Workbook.xlsx');
      await workbook.xlsx.readFile(filePath);
      const summary = workbook.getWorksheet('Summary');
      if (!summary) {
        throw new Error('expected a Summary sheet');
      }
      summary.getCell('A3').value = 'WPFBQ 2027 — Junior Corpus';
      await workbook.xlsx.writeFile(filePath);
      const draft = await buildOfficialSponsorDraft({
        directory,
        profile: {
          seasonId: '2027',
          sources: [
            {
              sourceId: 'beginner',
              fileName: 'WPFBQ_2027_Beginner_Data_Workbook.xlsx',
              materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
            },
          ],
        },
        seasonDates: SEASON_DATES,
      });
      expect(draft.status).toBe('failed');
      expect(draft.pipeline.content).toBeUndefined();
      expect(draft.pipeline.report.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'workbook_division_mismatch',
            workbook: 'WPFBQ_2027_Beginner_Data_Workbook.xlsx',
            sheet: 'Summary',
            field: 'fileName',
          }),
        ]),
      );
      expect(draft.pipeline.report.errors.some((item) => item.reason.includes('Junior Corpus'))).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('four-MaterialSet official draft import boundary', () => {
  it('rejects the draft package on the normal import path', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-slice-c-'));
    try {
      await writeDraftWorkbook(directory, 'beginner.xlsx');
      await writeDraftWorkbook(directory, 'junior.xlsx');
      await writeDraftWorkbook(directory, 'senior.xlsx');
      const profile = {
        seasonId: '2027',
        sources: [
          {
            sourceId: 'beginner',
            fileName: 'beginner.xlsx',
            materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
          },
          {
            sourceId: 'junior',
            fileName: 'junior.xlsx',
            materialSets: [{ divisionId: 'junior', materialSetId: 'junior-2027' }],
          },
          {
            sourceId: 'senior',
            fileName: 'senior.xlsx',
            materialSets: SENIOR_TARGETS,
          },
        ],
      } as const satisfies SponsorSourceProfile;
      const draft = await buildOfficialSponsorDraft({
        directory,
        profile,
        seasonDates: SEASON_DATES,
      });
      expect(draft.status).toBe('passed');
      expect(draft.pipeline.content?.schemaVersion).toBe('1.1.0');
      const content = draft.pipeline.content;
      const manifest = draft.pipeline.manifest;
      if (!content || !manifest) {
        throw new Error('expected a draft package');
      }
      expect(validateContentPackage(content).some((item) => item.code === 'material_set_count')).toBe(true);
      const strict = runPipelineFromWorkbooks(draft.pipeline.workbooks);
      expect(strict.status).toBe('failed');
      expect(strict.report.errors.some((item) => item.code === 'material_set_count')).toBe(true);

      const packageDir = path.join(directory, 'package');
      await mkdir(packageDir);
      await writeFile(path.join(packageDir, 'content.json'), stablePrettyJson(content), 'utf8');
      await writeFile(path.join(packageDir, 'manifest.json'), stablePrettyJson(manifest), 'utf8');
      await expect(loadValidatedContentPackage(packageDir)).rejects.toThrow(/exactly 5 independent MaterialSets/);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('fails the draft when All Frequency Words is missing', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-slice-c-missing-'));
    try {
      await writeDraftWorkbook(directory, 'beginner.xlsx', { frequency: false });
      const draft = await buildOfficialSponsorDraft({
        directory,
        profile: {
          seasonId: '2027',
          sources: [
            {
              sourceId: 'beginner',
              fileName: 'beginner.xlsx',
              materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
            },
          ],
        },
        seasonDates: SEASON_DATES,
      });
      expect(draft.status).toBe('failed');
      expect(draft.workbookReadCount).toBe(1);
      expect(draft.pipeline.content).toBeUndefined();
      expect(draft.pipeline.report.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'missing_sheet',
            workbook: 'beginner.xlsx',
            sheet: SPONSOR_FREQUENCY_SHEET,
          }),
        ]),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

async function writeDraftWorkbook(
  directory: string,
  fileName: string,
  options: { frequency?: boolean } = {},
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('Summary');
  summary.getCell('A1').value = 'Rules version';
  summary.getCell('B1').value = RULES_VERSION;
  const sheet = workbook.addWorksheet('Verse List');
  SPONSOR_VERSE_LIST_COLUMNS.forEach((header, index) => {
    sheet.getRow(1).getCell(index + 1).value = header;
  });
  const values: Record<string, ExcelJS.CellValue> = {
    Seq: 1,
    Section: 'Only Section',
    Reference: 'Sample 1:1',
    'Unique Beginning': 'Alpha',
    'Unique Ending': 'line',
    'Verse Text': 'Alpha  line;',
  };
  SPONSOR_VERSE_LIST_COLUMNS.forEach((header, index) => {
    const value = values[header];
    if (value !== undefined) {
      sheet.getRow(2).getCell(index + 1).value = value;
    }
  });
  if (options.frequency !== false) {
    const frequency = workbook.addWorksheet(SPONSOR_FREQUENCY_SHEET);
    ['Class', 'Word', 'Verses', 'Occurrences', 'Repeats In Verse', 'References'].forEach((header, index) => {
      frequency.getRow(1).getCell(index + 1).value = header;
    });
    frequency.getRow(2).getCell(1).value = 1;
    frequency.getRow(2).getCell(2).value = 'Alpha';
    frequency.getRow(2).getCell(3).value = 1;
    frequency.getRow(2).getCell(4).value = 1;
    frequency.getRow(2).getCell(6).value = 'Sample 1:1';
    const tier = workbook.addWorksheet('1x Words');
    tier.getRow(1).getCell(1).value = 'Word';
    tier.getRow(2).getCell(1).value = 'Alpha';
  }
  await workbook.xlsx.writeFile(path.join(directory, fileName));
}
