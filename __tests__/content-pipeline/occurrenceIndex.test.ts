/**
 * @jest-environment node
 */
import { ANNOTATION_COLUMNS } from '../../scripts/content-pipeline/constants';
import { convertWorkbooksToPackage } from '../../scripts/content-pipeline/convert';
import { canonicalize, fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import { runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import { findPhraseOccurrences } from '../../scripts/content-pipeline/resolveAnnotationTarget';
import { buildAllSyntheticWorkbooks, SYNTHETIC_VERSES } from '../../scripts/content-pipeline/syntheticData';
import { cadetSource, cloneWorkbook, workbookBufferFromData } from '../../scripts/content-pipeline/testSupport';
import type { AuthoringWorkbookData } from '../../scripts/content-pipeline/types';
import {
  createAuthoringWorkbook,
  parseWorkbookBuffer,
  workbookToBuffer,
} from '../../scripts/content-pipeline/workbookIo';

function withOccurrence(
  occurrenceIndex: number | undefined,
  annotationIndex = 0,
  phrase?: string,
): AuthoringWorkbookData {
  const workbook = cloneWorkbook(cadetSource());
  const current = workbook.annotations[annotationIndex];
  if (!current) {
    throw new Error(`missing annotation ${annotationIndex}`);
  }
  workbook.annotations[annotationIndex] = {
    ...current,
    occurrenceIndex,
    ...(phrase === undefined ? {} : { phrase }),
  };
  return workbook;
}

function withCadetSeason(cadet: AuthoringWorkbookData) {
  const rest = buildAllSyntheticWorkbooks().filter(
    (workbook) => workbook.materialSet.materialSetId !== 'cadet',
  );
  return runPipelineFromWorkbooks([cadet, ...rest]);
}

function failureReasons(workbook: AuthoringWorkbookData): string[] {
  const result = withCadetSeason(workbook);
  expect(result.status).toBe('failed');
  return result.report.errors.map((item) => item.reason);
}

function cadetAnnotation(
  result: ReturnType<typeof withCadetSeason>,
  cardId: string,
  phrase: string,
) {
  return result.content?.materialSets
    .find((materialSet) => materialSet.materialSetId === 'cadet')
    ?.cards.find((card) => card.cardId === cardId)
    ?.annotations.find((item) => item.sourceTarget.phrase === phrase);
}

describe('phraseOccurrence occurrenceIndex', () => {
  it('accepts a unique phrase with a blank occurrenceIndex and resolves it as 1', () => {
    const result = withCadetSeason(withOccurrence(undefined, 0));
    expect(result.status).toBe('passed');

    const annotation = cadetAnnotation(result, 'c1', 'Light');
    expect(annotation?.sourceTarget.occurrenceIndex).toBe(1);
    expect(annotation?.resolvedTarget).toEqual(
      findPhraseOccurrences(SYNTHETIC_VERSES.short.verseText, 'Light')[0],
    );
  });

  it('continues to accept a unique phrase with explicit occurrenceIndex 1', () => {
    const result = withCadetSeason(withOccurrence(1, 0));
    expect(result.status).toBe('passed');
    expect(cadetAnnotation(result, 'c1', 'Light')?.sourceTarget.occurrenceIndex).toBe(1);
  });

  it('fails when a repeated phrase has a blank occurrenceIndex', () => {
    const reasons = failureReasons(withOccurrence(undefined, 1));
    expect(reasons).toContain(
      'Phrase "the word" occurs 3 times. Enter occurrenceIndex 1, 2, or 3.',
    );
  });

  it('resolves occurrenceIndex 2 to the second exact match', () => {
    const result = withCadetSeason(cadetSource());
    expect(result.status).toBe('passed');
    const verse = SYNTHETIC_VERSES.repeatedWord.verseText;
    const matches = findPhraseOccurrences(verse, 'the word');
    const annotation = cadetAnnotation(result, 'c2', 'the word');
    expect(annotation?.sourceTarget.occurrenceIndex).toBe(2);
    expect(annotation?.resolvedTarget).toEqual(matches[1]);
    expect(verse.slice(annotation?.resolvedTarget.start, annotation?.resolvedTarget.end)).toBe(
      'the word',
    );
  });

  it('fails when occurrenceIndex is greater than the number of matches', () => {
    const reasons = failureReasons(withOccurrence(4, 1));
    expect(reasons.some((reason) => reason.includes('outside that range'))).toBe(true);
    expect(reasons.some((reason) => reason.includes('Enter occurrenceIndex 1, 2, or 3'))).toBe(
      true,
    );
  });

  it('fails when the phrase is missing and occurrenceIndex is blank', () => {
    const reasons = failureReasons(withOccurrence(undefined, 0, 'missing phrase'));
    expect(reasons.some((reason) => reason.includes('does not appear'))).toBe(true);
  });

  it('fails when the phrase is missing and occurrenceIndex is provided', () => {
    const reasons = failureReasons(withOccurrence(1, 0, 'missing phrase'));
    expect(reasons.some((reason) => reason.includes('does not appear'))).toBe(true);
  });

  it('rejects occurrenceIndex 0', () => {
    const reasons = failureReasons(withOccurrence(0, 0));
    expect(reasons.some((reason) => reason.includes('"0" is not valid'))).toBe(true);
  });

  it('rejects a negative occurrenceIndex', () => {
    const reasons = failureReasons(withOccurrence(-2, 0));
    expect(reasons.some((reason) => reason.includes('"-2" is not valid'))).toBe(true);
  });

  it('rejects decimal and malformed occurrenceIndex values', async () => {
    const reasons = failureReasons(withOccurrence(1.5, 0));
    expect(reasons.some((reason) => reason.includes('"1.5" is not valid'))).toBe(true);

    const source = cadetSource();
    const workbook = createAuthoringWorkbook(source, { synthetic: true });
    const sheet = workbook.getWorksheet('Annotations');
    if (!sheet) {
      throw new Error('missing Annotations sheet');
    }
    const column = ANNOTATION_COLUMNS.indexOf('occurrenceIndex') + 1;
    const decimalRow = sheet.getRow(2);
    decimalRow.getCell(column).value = 1.5;
    decimalRow.commit();
    const textRow = sheet.getRow(3);
    textRow.getCell(column).value = 'second';
    textRow.commit();

    const parsed = await parseWorkbookBuffer(
      await workbookToBuffer(workbook),
      source.workbookName,
    );
    expect(parsed.errors.filter((item) => item.code === 'invalid_occurrence_index')).toHaveLength(
      2,
    );
    expect(parsed.data?.annotations[0]?.occurrenceIndex).toBeNaN();
    expect(parsed.data?.annotations[1]?.occurrenceIndex).toBeNaN();
    if (!parsed.data) {
      throw new Error('expected parsed workbook data');
    }
    const pipeline = withCadetSeason(parsed.data);
    expect(pipeline.status).toBe('failed');
    expect(
      pipeline.report.errors.filter((item) => item.code === 'invalid_occurrence_index').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('keeps the synthetic dataset valid when occurrenceIndex is explicit', () => {
    const result = runPipelineFromWorkbooks(buildAllSyntheticWorkbooks());
    expect(result.status).toBe('passed');
    const indexes = result.content?.materialSets.flatMap((materialSet) =>
      materialSet.cards.flatMap((card) =>
        card.annotations.map((annotation) => annotation.sourceTarget.occurrenceIndex),
      ),
    );
    expect(indexes?.length).toBeGreaterThan(0);
    expect(indexes?.every((index) => Number.isInteger(index) && index >= 1)).toBe(true);
    expect(indexes).toContain(1);
  });

  it('normalizes a blank unique occurrence and explicit 1 to the same package', async () => {
    const explicit = withOccurrence(1, 0);
    const blank = withOccurrence(undefined, 0);
    const explicitPackage = convertWorkbooksToPackage([explicit]);
    const blankPackage = convertWorkbooksToPackage([blank]);

    expect(explicitPackage.errors).toEqual([]);
    expect(blankPackage.errors).toEqual([]);
    expect(canonicalize(blankPackage.content)).toBe(canonicalize(explicitPackage.content));
    expect(fingerprintContent(blankPackage.content!)).toBe(
      fingerprintContent(explicitPackage.content!),
    );

    const parsed = await parseWorkbookBuffer(
      await workbookBufferFromData(blank),
      blank.workbookName,
    );
    expect(parsed.errors).toEqual([]);
    expect(parsed.data?.annotations[0]?.occurrenceIndex).toBeUndefined();
    if (!parsed.data) {
      throw new Error('expected parsed workbook data');
    }
    const fromSpreadsheet = convertWorkbooksToPackage([parsed.data]);
    expect(fromSpreadsheet.errors).toEqual([]);
    expect(canonicalize(fromSpreadsheet.content)).toBe(canonicalize(explicitPackage.content));
  });
});
