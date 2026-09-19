/**
 * @jest-environment node
 */
import { formatValidationIssue } from '../../scripts/content-pipeline/errors';
import { validateSourceCollection, validateSourceWorkbook } from '../../scripts/content-pipeline/validateSource';
import { buildSyntheticWorkbook } from '../../scripts/content-pipeline/syntheticData';
import { cadetSource, cloneWorkbook } from '../../scripts/content-pipeline/testSupport';

describe('source validation', () => {
  it('accepts the synthetic cadet workbook', () => {
    expect(validateSourceWorkbook(cadetSource())).toEqual([]);
  });

  it('reports missing required Scripture fields with workbook/sheet/row/field', () => {
    const workbook = cloneWorkbook(cadetSource());
    const card = workbook.cards[0];
    if (!card) {
      throw new Error('expected a card');
    }
    card.reference = '';
    card.verseText = '';

    const errors = validateSourceWorkbook(workbook);
    const reference = errors.find((item) => item.field === 'reference');
    const verseText = errors.find((item) => item.field === 'verseText');

    expect(reference?.sheet).toBe('Cards');
    expect(reference?.row).toBe(2);
    expect(reference?.workbook).toBe(workbook.workbookName);
    expect(formatValidationIssue(reference!)).toMatch(/Scripture reference/);
    expect(verseText?.reason).toMatch(/Scripture text/);
  });

  it('rejects duplicate card numbers and cardIds in the same MaterialSet', () => {
    const duplicateNumber = cloneWorkbook(cadetSource());
    duplicateNumber.cards[1] = { ...duplicateNumber.cards[1]!, cardNumber: 1 };
    expect(validateSourceWorkbook(duplicateNumber).some((item) => item.code === 'duplicate_card_number')).toBe(
      true,
    );

    const duplicateId = cloneWorkbook(cadetSource());
    duplicateId.cards[1] = { ...duplicateId.cards[1]!, cardId: 'c1' };
    expect(validateSourceWorkbook(duplicateId).some((item) => item.code === 'duplicate_card_id')).toBe(
      true,
    );
  });

  it('rejects an invalid section membership', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.cards[0] = { ...workbook.cards[0]!, sectionId: 'missing-section' };
    expect(validateSourceWorkbook(workbook).some((item) => item.code === 'invalid_section')).toBe(true);
  });

  it('rejects an orphan section with no cards', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.sections.push({ sectionId: 'empty', title: 'Empty', displayOrder: 9 });
    expect(validateSourceWorkbook(workbook).some((item) => item.code === 'orphan_section')).toBe(true);
  });

  it('rejects unsupported annotation types and strategies', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.annotations[0] = {
      ...workbook.annotations[0]!,
      type: 'officialMysteryMark',
      strategy: 'committeeGlyph',
    };
    const errors = validateSourceWorkbook(workbook);
    expect(errors.some((item) => item.code === 'unsupported_annotation_type')).toBe(true);
    expect(errors.some((item) => item.code === 'unsupported_annotation_strategy')).toBe(true);
  });

  it('treats a missing occurrenceIndex as an ambiguous phrase target', () => {
    const workbook = cloneWorkbook(cadetSource());
    workbook.annotations[1] = { ...workbook.annotations[1]!, occurrenceIndex: undefined };
    expect(validateSourceWorkbook(workbook).some((item) => item.code === 'ambiguous_phrase_target')).toBe(
      true,
    );
  });

  it('rejects two MaterialSets that claim the same division', () => {
    const cadet = buildSyntheticWorkbook('cadet');
    const beginner = buildSyntheticWorkbook('beginner');
    beginner.materialSet.divisionId = 'cadet';
    const errors = validateSourceCollection([cadet, beginner]);
    expect(errors.some((item) => item.code === 'material_set_division_mismatch')).toBe(true);
  });
});
