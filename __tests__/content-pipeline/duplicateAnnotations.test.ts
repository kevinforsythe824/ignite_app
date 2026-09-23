/**
 * @jest-environment node
 */
import { PHRASE_OCCURRENCE_STRATEGY } from '../../scripts/content-pipeline/constants';
import { runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';
import { cadetSource, cloneWorkbook } from '../../scripts/content-pipeline/testSupport';
import type { AuthoringWorkbookData, ContentPackage } from '../../scripts/content-pipeline/types';
import { validateContentPackage } from '../../scripts/content-pipeline/validatePackage';

function withCadet(cadet: AuthoringWorkbookData) {
  const rest = buildAllSyntheticWorkbooks().filter(
    (workbook) => workbook.materialSet.materialSetId !== 'cadet',
  );
  return runPipelineFromWorkbooks([cadet, ...rest]);
}

function packageFrom(workbooks: AuthoringWorkbookData[]): ContentPackage {
  const result = runPipelineFromWorkbooks(workbooks);
  if (!result.content) {
    throw new Error(result.report.errors.map((item) => item.reason).join('\n'));
  }
  return result.content;
}

describe('duplicate annotations', () => {
  it('rejects an exact duplicated logical annotation and its derived annotationId', () => {
    const cadet = cloneWorkbook(cadetSource());
    const original = cadet.annotations[1];
    if (!original) {
      throw new Error('expected cadet annotation');
    }
    cadet.annotations.push({
      ...original,
      notes: 'same logical annotation, different note',
      sourceRow: 17,
    });

    const result = withCadet(cadet);
    expect(result.status).toBe('failed');
    expect(result.content).toBeUndefined();

    const logical = result.report.errors.find((item) => item.code === 'duplicate_annotation');
    const identity = result.report.errors.find((item) => item.code === 'duplicate_annotation_id');
    expect(logical?.workbook).toBe(cadet.workbookName);
    expect(logical?.sheet).toBe('Annotations');
    expect(logical?.row).toBe(17);
    expect(logical?.reason).toContain('the word');
    expect(logical?.reason).toContain('occurrenceIndex 2');
    expect(identity?.row).toBe(17);
    expect(identity?.reason).toContain('annotationId');
  });

  it('rejects a package that repeats an annotationId', () => {
    const content = packageFrom(buildAllSyntheticWorkbooks());
    const card = content.materialSets
      .flatMap((materialSet) => materialSet.cards)
      .find((item) => item.annotations.length >= 2);
    const first = card?.annotations[0];
    const second = card?.annotations[1];
    if (!card || !first || !second) {
      throw new Error('expected two annotations on one card');
    }
    second.annotationId = first.annotationId;

    const errors = validateContentPackage(content);
    expect(errors.some((item) => item.code === 'duplicate_annotation_id')).toBe(true);
  });

  it('accepts overlapping annotations that differ by type or phrase', () => {
    const cadet = cloneWorkbook(cadetSource());
    cadet.annotations.push(
      {
        cardId: 'c1',
        type: 'highlight',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'shines',
        occurrenceIndex: 1,
      },
      {
        cardNumber: 2,
        type: 'keyword',
        strategy: PHRASE_OCCURRENCE_STRATEGY,
        phrase: 'the word',
        occurrenceIndex: 2,
      },
    );

    const result = withCadet(cadet);
    expect(result.status).toBe('passed');
    const cards = result.content?.materialSets.find((item) => item.materialSetId === 'cadet')?.cards;
    const lightCard = cards?.find((card) => card.cardId === 'c1');
    const wordCard = cards?.find((card) => card.cardId === 'c2');
    expect(lightCard?.annotations.map((item) => `${item.type}:${item.sourceTarget.phrase}`).sort()).toEqual(
      ['highlight:shines', 'keyword:Light'],
    );
    expect(wordCard?.annotations.map((item) => item.type).sort()).toEqual(['highlight', 'keyword']);
  });

  it('accepts the same repeated phrase at different occurrence indexes', () => {
    const cadet = cloneWorkbook(cadetSource());
    cadet.annotations.push({
      cardNumber: 2,
      type: 'highlight',
      strategy: PHRASE_OCCURRENCE_STRATEGY,
      phrase: 'the word',
      occurrenceIndex: 1,
    });

    const result = withCadet(cadet);
    expect(result.status).toBe('passed');
    const indexes = result.content?.materialSets
      .find((item) => item.materialSetId === 'cadet')
      ?.cards.find((card) => card.cardId === 'c2')
      ?.annotations.filter((item) => item.sourceTarget.phrase === 'the word')
      .map((item) => item.sourceTarget.occurrenceIndex)
      .sort();
    expect(indexes).toEqual([1, 2]);
  });
});
