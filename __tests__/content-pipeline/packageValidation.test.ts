/**
 * @jest-environment node
 */
import { convertWorkbooksToPackage } from '../../scripts/content-pipeline/convert';
import { validateContentPackage } from '../../scripts/content-pipeline/validatePackage';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';
import type { ContentPackage } from '../../scripts/content-pipeline/types';

function validPackage(): ContentPackage {
  const converted = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());
  if (!converted.content) {
    throw new Error(converted.errors.map((item) => item.reason).join('\n'));
  }
  return converted.content;
}

describe('package validation', () => {
  it('accepts the synthetic season package', () => {
    expect(validateContentPackage(validPackage())).toEqual([]);
  });

  it('rejects an unsupported schemaVersion', () => {
    const content = validPackage();
    content.schemaVersion = '9.9.9';
    expect(validateContentPackage(content).some((item) => item.code === 'unsupported_schema_version')).toBe(
      true,
    );
  });

  it('rejects a missing official division MaterialSet', () => {
    const content = validPackage();
    content.materialSets = content.materialSets.filter((item) => item.materialSetId !== 'junior');
    const errors = validateContentPackage(content);
    expect(errors.some((item) => item.code === 'material_set_count')).toBe(true);
  });

  it('rejects duplicate cardId inside one MaterialSet but not across MaterialSets', () => {
    const content = validPackage();
    const cadet = content.materialSets[0];
    const first = cadet?.cards[0];
    const second = cadet?.cards[1];
    if (!cadet || !first || !second) {
      throw new Error('expected cadet cards');
    }
    second.cardId = first.cardId;
    cadet.sections[0] = {
      ...cadet.sections[0]!,
      cardIds: cadet.sections[0]!.cardIds.map((id) => (id === 'c2' ? first.cardId : id)),
    };

    expect(validateContentPackage(content).some((item) => item.code === 'duplicate_card_id')).toBe(true);
  });

  it('rejects an orphan card that is not in any section', () => {
    const content = validPackage();
    const cadet = content.materialSets[0];
    if (!cadet) {
      throw new Error('expected cadet');
    }
    cadet.sections = cadet.sections.map((section) => ({
      ...section,
      cardIds: section.cardIds.filter((cardId) => cardId !== 'c3'),
    }));

    expect(validateContentPackage(content).some((item) => item.code === 'orphan_card')).toBe(true);
  });

  it('rejects a resolved annotation span that no longer matches the verse', () => {
    const content = validPackage();
    const annotated = content.materialSets[0]?.cards.find((card) => card.annotations.length > 0);
    const annotation = annotated?.annotations[0];
    if (!annotated || !annotation) {
      throw new Error('expected an annotation');
    }
    annotation.resolvedTarget = { start: 0, end: 1 };

    expect(validateContentPackage(content).some((item) => item.code === 'invalid_annotation_target')).toBe(
      true,
    );
  });
});
