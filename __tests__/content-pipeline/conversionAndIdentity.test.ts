/**
 * @jest-environment node
 */
import { makeCardKey } from '../../src/features/flashcards/domain/card';
import { convertWorkbooksToPackage } from '../../scripts/content-pipeline/convert';
import { canonicalize } from '../../scripts/content-pipeline/fingerprint';
import { runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';

describe('deterministic conversion and Card identity', () => {
  it('converts equivalent source to identical canonical content twice', () => {
    const first = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());
    const second = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());

    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
    expect(canonicalize(first.content)).toBe(canonicalize(second.content));
  });

  it('builds a normalized IR with season, five MaterialSets, sections, cards, and annotations', () => {
    const converted = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());
    expect(converted.ir?.season.seasonId).toBe('dev-synthetic-s3');
    expect(converted.ir?.materialSets.map((item) => item.materialSetId)).toEqual([
      'cadet',
      'beginner',
      'junior',
      'intermediate',
      'experienced',
    ]);
    expect(converted.ir?.source.workbookNames).toHaveLength(5);

    const cadet = converted.ir?.materialSets.find((item) => item.materialSetId === 'cadet');
    expect(cadet?.sections).toHaveLength(2);
    expect(cadet?.cards[1]?.annotations[0]?.sourceTarget.strategy).toBe('phraseOccurrence');
    expect(cadet?.cards[1]?.annotations[0]?.resolvedTarget).toEqual(
      expect.objectContaining({ start: expect.any(Number), end: expect.any(Number) }),
    );
    expect(cadet).not.toHaveProperty('parentMaterialSetId');
  });

  it('allows the same local cardId across MaterialSets because identity includes materialSetId', () => {
    const converted = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());
    const keys = converted.content?.materialSets.map((materialSet) => {
      const shared = materialSet.cards.find((card) => card.cardId === 'c1');
      if (!shared) {
        throw new Error(`expected cardId c1 in ${materialSet.materialSetId}`);
      }
      return makeCardKey(shared.seasonId, shared.materialSetId, shared.cardId);
    });

    expect(keys).toHaveLength(5);
    expect(new Set(keys).size).toBe(5);
    expect(keys?.every((key) => key.includes(':c1'))).toBe(true);
  });

  it('keeps the same Scripture reference independent per MaterialSet', () => {
    const converted = convertWorkbooksToPackage(buildAllSyntheticWorkbooks());
    const sharedRefs = converted.content?.materialSets.map((materialSet) => {
      const card = materialSet.cards.find((item) => item.reference === 'SynTest 1:1');
      return {
        materialSetId: materialSet.materialSetId,
        cardNumber: card?.cardNumber,
        sectionId: card?.sectionId,
        annotationTypes: card?.annotations.map((item) => item.type) ?? [],
      };
    });

    expect(sharedRefs?.map((item) => item.cardNumber)).toEqual([1, 10, 5, 20, 100]);
    expect(new Set(sharedRefs?.map((item) => item.sectionId)).size).toBeGreaterThan(1);
    expect(new Set(sharedRefs?.map((item) => item.annotationTypes.join(','))).size).toBeGreaterThan(1);
  });

  it('does not put generatedAt or local paths into hashed content', () => {
    const first = runPipelineFromWorkbooks(buildAllSyntheticWorkbooks(), {
      generatedAt: '2026-01-01T00:00:00.000Z',
    });
    const second = runPipelineFromWorkbooks(buildAllSyntheticWorkbooks(), {
      generatedAt: '2026-09-18T12:00:00.000Z',
    });

    expect(first.manifest?.fingerprint).toBe(second.manifest?.fingerprint);
    expect(first.manifest?.generatedAt).not.toBe(second.manifest?.generatedAt);
    expect(canonicalize(first.content)).not.toContain('generatedAt');
    expect(canonicalize(first.content)).not.toContain('.xlsx');
  });
});
