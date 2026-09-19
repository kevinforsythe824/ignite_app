/**
 * @jest-environment node
 */
import { convertWorkbooksToPackage } from '../../scripts/content-pipeline/convert';
import { reconcileSourceToPackage } from '../../scripts/content-pipeline/reconcile';
import { runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import { buildAllSyntheticWorkbooks } from '../../scripts/content-pipeline/syntheticData';

describe('source-to-package reconciliation', () => {
  it('counts source and generated cards, sections, and annotations', () => {
    const workbooks = buildAllSyntheticWorkbooks();
    const converted = convertWorkbooksToPackage(workbooks);
    if (!converted.content) {
      throw new Error('expected content');
    }

    const { report, errors } = reconcileSourceToPackage(workbooks, converted.content);
    expect(errors).toEqual([]);
    expect(report.counts.sourceCardCount).toBe(report.counts.generatedCardCount);
    expect(report.counts.sourceCardCount).toBe(15);
    expect(report.counts.cardsPerMaterialSet.cadet).toBe(3);
    expect(report.counts.cardsPerSection['cadet:unit-1']).toBe(2);
    expect(report.counts.annotationsPerMaterialSet.cadet).toBe(2);
    expect(report.counts.annotationsPerType.highlight).toBeGreaterThan(0);
    expect(report.mismatches).toEqual([]);
    expect(report.unmappedSourceValues).toEqual([]);
  });

  it('fails closed when a generated card is missing', () => {
    const workbooks = buildAllSyntheticWorkbooks();
    const converted = convertWorkbooksToPackage(workbooks);
    if (!converted.content) {
      throw new Error('expected content');
    }
    converted.content.materialSets[0] = {
      ...converted.content.materialSets[0]!,
      cards: converted.content.materialSets[0]!.cards.slice(1),
    };

    const { errors } = reconcileSourceToPackage(workbooks, converted.content);
    expect(errors.some((item) => item.code === 'reconciliation_missing_card')).toBe(true);
    expect(errors.some((item) => item.code === 'reconciliation_card_count')).toBe(true);
  });

  it('includes reconciliation on a successful pipeline report', () => {
    const result = runPipelineFromWorkbooks(buildAllSyntheticWorkbooks());
    expect(result.status).toBe('passed');
    expect(result.report.reconciliation?.counts.generatedCardCount).toBe(15);
  });
});
