/**
 * @jest-environment node
 */
import { formatValidationIssues } from '../../scripts/content-pipeline/errors';
import { runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import { buildAllSyntheticWorkbooks, buildSyntheticWorkbook } from '../../scripts/content-pipeline/syntheticData';
import { cadetSource, cloneWorkbook } from '../../scripts/content-pipeline/testSupport';

function expectCode(workbooks: ReturnType<typeof buildAllSyntheticWorkbooks>, code: string): void {
  const result = runPipelineFromWorkbooks(workbooks);
  expect(result.status).toBe('failed');
  expect(result.report.errors.some((item) => item.code === code)).toBe(true);
}

describe('invalid fixtures fail closed', () => {
  it('duplicate card number', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.cards[1] = { ...workbook.cards[1]!, cardNumber: 1 };
    expectCode([workbook], 'duplicate_card_number');
  });

  it('duplicate cardId in the same MaterialSet', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.cards[1] = { ...workbook.cards[1]!, cardId: 'c1' };
    expectCode([workbook], 'duplicate_card_id');
  });

  it('missing required fields', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.package.seasonId = '';
    workbook.cards[0] = { ...workbook.cards[0]!, verseText: '' };
    const result = runPipelineFromWorkbooks([workbook]);
    expect(result.report.errors.some((item) => item.field === 'seasonId')).toBe(true);
    expect(result.report.errors.some((item) => item.field === 'verseText')).toBe(true);
  });

  it('invalid section', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.cards[0] = { ...workbook.cards[0]!, sectionId: 'no-such-section' };
    expectCode([workbook], 'invalid_section');
  });

  it('orphan section membership', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.sections.push({ sectionId: 'orphan', title: 'Orphan', displayOrder: 9 });
    expectCode([workbook], 'orphan_section');
  });

  it('unsupported annotation target strategy', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.annotations[0] = { ...workbook.annotations[0]!, strategy: 'glyphOffset' };
    expectCode([workbook], 'unsupported_annotation_strategy');
  });

  it('ambiguous repeated-phrase target', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.annotations[1] = {
      ...workbook.annotations[1]!,
      phrase: 'the word',
      occurrenceIndex: 9,
    };
    const others = buildAllSyntheticWorkbooks().filter((item) => item.materialSet.materialSetId !== 'cadet');
    const result = runPipelineFromWorkbooks([workbook, ...others]);
    expect(result.status).toBe('failed');
    expect(result.report.errors.some((item) => item.code === 'ambiguous_phrase_target')).toBe(true);
  });

  it('unresolved phrase target', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.annotations[0] = {
      ...workbook.annotations[0]!,
      phrase: 'this phrase is not in the verse',
      occurrenceIndex: 1,
    };
    const others = buildAllSyntheticWorkbooks().filter((item) => item.materialSet.materialSetId !== 'cadet');
    const result = runPipelineFromWorkbooks([workbook, ...others]);
    expect(result.status).toBe('failed');
    expect(result.report.errors.some((item) => item.code === 'unresolved_phrase_target')).toBe(true);
  });

  it('MaterialSet / Division mismatch', () => {
    const cadet = buildSyntheticWorkbook('cadet');
    const beginner = buildSyntheticWorkbook('beginner');
    beginner.materialSet.divisionId = 'cadet';
    const result = runPipelineFromWorkbooks([cadet, beginner]);
    expect(result.status).toBe('failed');
    expect(result.report.errors.some((item) => item.code === 'material_set_division_mismatch')).toBe(
      true,
    );
  });

  it('prints human-readable errors with location', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.cards[0] = { ...workbook.cards[0]!, verseText: '' };
    const result = runPipelineFromWorkbooks([workbook]);
    const printed = formatValidationIssues(result.report.errors);
    expect(printed).toMatch(/Cards/);
    expect(printed).toMatch(/row 2/);
    expect(printed).toMatch(/verseText/);
    expect(printed).toMatch(/Scripture text/);
  });
});
