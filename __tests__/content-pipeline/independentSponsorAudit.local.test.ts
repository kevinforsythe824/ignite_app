/**
 * @jest-environment node
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildOfficialSponsorDraft } from '../../scripts/content-pipeline/buildOfficialSponsorDraft';
import { fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import { WPFBQ_2027_SPONSOR_PROFILE } from '../../scripts/content-pipeline/sponsorSourceProfile';
import type { ContentPackage } from '../../scripts/content-pipeline/types';
import { mapFirestoreCardToDomain } from '../../src/features/flashcards/data/mapFirestoreToCard';
import { auditOfficialSponsorAnnotations } from '../../test-utils/independentSponsorAudit';

const LOCAL_DIR = path.join('content', 'authoring', 'local');
const SEASON_DATES = { startDate: '2027-01-01', endDate: '2027-08-31' } as const;
const WORKBOOK_SHA256: Readonly<Record<string, string>> = {
  'WPFBQ_2027_Cadet_Data_Workbook.xlsx':
    '4df71ca79b5bf4e659d73be648fe6e4e6d91a85317364968ddf7c6b3b36d13cd',
  'WPFBQ_2027_Beginner_Data_Workbook.xlsx':
    '4515cf815ca3ba38fd2ce4ccec7064d7a3c42ff540d17b3a153e3178130ccee7',
  'WPFBQ_2027_Junior_Data_Workbook.xlsx':
    'cbf797e220e2a92f2904cd499365ef7d499057696b6dfeedf3c10fa1578e81ac',
  'WPFBQ_2027_Senior_Data_Workbook.xlsx':
    '856d02dfeb7c095e57cd79618875dd83a7a51aac06209097fce973786b05af27',
};

const WORKBOOKS_PRESENT = WPFBQ_2027_SPONSOR_PROFILE.sources.every((source) =>
  existsSync(path.join(LOCAL_DIR, source.fileName)),
);

function workbookHashes(): Record<string, string> {
  return Object.fromEntries(
    WPFBQ_2027_SPONSOR_PROFILE.sources.map((source) => [
      source.fileName,
      createHash('sha256').update(readFileSync(path.join(LOCAL_DIR, source.fileName))).digest('hex'),
    ]),
  );
}

function annotationProjection(content: ContentPackage) {
  return content.materialSets.map((materialSet) => ({
    materialSetId: materialSet.materialSetId,
    divisionId: materialSet.divisionId,
    cards: materialSet.cards.map((card) => ({
      cardId: card.cardId,
      cardNumber: card.cardNumber,
      reference: card.reference,
      verseText: card.verseText,
      sectionId: card.sectionId,
      annotations: card.annotations.map((annotation) => ({
        annotationId: annotation.annotationId,
        cardId: annotation.cardId,
        type: annotation.type,
        sourceTarget: annotation.sourceTarget,
        resolvedTarget: annotation.resolvedTarget,
        frequencyTier: annotation.frequencyTier,
        notes: annotation.notes,
      })),
    })),
  }));
}

describe('annotation serialization preserves source fields', () => {
  it('keeps an exact repeated ending, frequency tier, and note on the domain card', () => {
    const verseText = 'Hope and hope.';
    const document = {
      seasonId: '2027',
      materialSetId: 'beginner-2027',
      cardId: 'c1',
      cardNumber: 1,
      reference: 'Sample 1:1',
      verseText,
      sectionId: 'opening',
      tags: [],
      annotations: [
        {
          annotationId: 'begin',
          cardId: 'c1',
          type: 'uniqueBeginning',
          sourceTarget: { strategy: 'phraseOccurrence', phrase: 'Hope', occurrenceIndex: 1 },
          resolvedTarget: { start: 0, end: 4 },
        },
        {
          annotationId: 'end',
          cardId: 'c1',
          type: 'uniqueEnding',
          sourceTarget: { strategy: 'phraseOccurrence', phrase: 'hope', occurrenceIndex: 1 },
          resolvedTarget: { start: 9, end: 13 },
        },
        {
          annotationId: 'freq',
          cardId: 'c1',
          type: 'frequency',
          sourceTarget: { strategy: 'phraseOccurrence', phrase: 'Hope', occurrenceIndex: 1 },
          resolvedTarget: { start: 0, end: 4 },
          frequencyTier: 2,
          notes: 'study note',
        },
      ],
    };
    const card = mapFirestoreCardToDomain(document, '2027', 'beginner-2027', 'c1');
    expect(card.verseText).toBe(verseText);
    expect(card.reference).toBe('Sample 1:1');
    expect(card.cardId).toBe('c1');
    expect(verseText.slice(9, 13)).toBe('hope');
    expect(card.annotations?.[1]).toMatchObject({
      type: 'uniqueEnding',
      sourceTarget: { phrase: 'hope', occurrenceIndex: 1, strategy: 'phraseOccurrence' },
      resolvedTarget: { start: 9, end: 13 },
    });
    expect(card.annotations?.[1]).not.toHaveProperty('frequencyTier');
    expect(card.annotations?.[2]).toMatchObject({
      type: 'frequency',
      frequencyTier: 2,
      notes: 'study note',
      sourceTarget: { phrase: 'Hope', occurrenceIndex: 1 },
      resolvedTarget: { start: 0, end: 4 },
    });
  });
});

(WORKBOOKS_PRESENT ? describe : describe.skip)('independent official annotation audit', () => {
  jest.setTimeout(180000);

  it('reconciles workbook cells to package annotations and keeps season dates out of annotation identity', async () => {
    expect(workbookHashes()).toEqual(WORKBOOK_SHA256);
    const report = await auditOfficialSponsorAnnotations();
    expect(report.discrepancyCount).toBe(0);
    expect(report.discrepancies).toEqual([]);

    const cadet = report.stats.find((item) => item.workbook.includes('Cadet'));
    const beginner = report.stats.find((item) => item.workbook.includes('Beginner'));
    const junior = report.stats.find((item) => item.workbook.includes('Junior'));
    const senior = report.stats.find((item) => item.workbook.includes('Senior'));
    if (!cadet || !beginner || !junior || !senior) {
      throw new Error('expected four workbook audits');
    }
    expect(cadet.verseRows).toBe(50);
    expect(cadet.uniqueBeginnings).toBe(50);
    expect(cadet.uniqueEndings).toBe(50);
    expect(cadet.blankBeginnings).toBe(0);
    expect(cadet.blankEndings).toBe(0);
    expect(cadet.frequencyEntries).toBe(189);
    expect(cadet.frequencyOccurrences).toBe(196);
    expect(cadet.frequencyByTier).toEqual({ 1: { entries: 189, occurrences: 196 } });
    expect(cadet.leadingPunctuationVerses).toBe(1);
    expect(cadet.beginningsThatIncludeLeadingPunctuation).toBe(0);
    expect(cadet.repeatedEndings.map((ending) => ending.reference).sort()).toEqual([
      '2 Corinthians 10:3',
      'Ephesians 6:13',
      'Psalm 56:10',
    ]);
    expect(cadet.repeatedEndings.every((ending) => ending.occurrenceIndex > 1)).toBe(true);
    expect(beginner.repeatedEndings).toHaveLength(9);
    expect(junior.repeatedEndings).toHaveLength(16);
    expect(senior.repeatedEndings).toHaveLength(20);
    expect(senior.beginningsThatIncludeLeadingPunctuation).toBe(0);
    expect(senior.leadingPunctuationVerses).toBeGreaterThan(0);
    for (const item of [cadet, beginner, junior, senior]) {
      expect(item.repeatedEndings.every((ending) => ending.occurrenceIndex > 1)).toBe(true);
      expect(item.blankBeginnings).toBe(0);
      expect(item.blankEndings).toBe(0);
    }
    const sourceAnnotations =
      cadet.uniqueBeginnings +
      cadet.uniqueEndings +
      cadet.frequencyOccurrences +
      beginner.uniqueBeginnings +
      beginner.uniqueEndings +
      beginner.frequencyOccurrences +
      (junior.uniqueBeginnings + junior.uniqueEndings + junior.frequencyOccurrences) +
      (senior.uniqueBeginnings + senior.uniqueEndings + senior.frequencyOccurrences) * 2;
    expect(report.totalGenerated).toBe(sourceAnnotations);
    expect(report.totalGenerated).toBe(8088);
    expect(report.materialSets.map((item) => [item.materialSetId, item.cards, item.total])).toEqual([
      ['cadet-2027', 50, 296],
      ['beginner-2027', 150, 741],
      ['junior-2027', 250, 1643],
      ['intermediate-2027', 392, 2704],
      ['experienced-2027', 392, 2704],
    ]);

    const first = await buildOfficialSponsorDraft({ directory: LOCAL_DIR, seasonDates: SEASON_DATES });
    const second = await buildOfficialSponsorDraft({ directory: LOCAL_DIR, seasonDates: SEASON_DATES });
    if (!first.pipeline.content || !second.pipeline.content) {
      throw new Error('expected two official drafts');
    }
    expect(first.pipeline.content.season).toMatchObject(SEASON_DATES);
    expect(first.pipeline.content.season).not.toHaveProperty('igniteAvailabilityDate');
    expect(fingerprintContent(second.pipeline.content)).toBe(fingerprintContent(first.pipeline.content));
    expect(annotationProjection(second.pipeline.content)).toEqual(annotationProjection(first.pipeline.content));

    const shifted = await buildOfficialSponsorDraft({
      directory: LOCAL_DIR,
      seasonDates: { startDate: '2027-01-01', endDate: '2027-09-15' },
    });
    if (!shifted.pipeline.content) {
      throw new Error('expected a date-shifted draft');
    }
    expect(fingerprintContent(shifted.pipeline.content)).not.toBe(fingerprintContent(first.pipeline.content));
    expect(annotationProjection(shifted.pipeline.content)).toEqual(annotationProjection(first.pipeline.content));
    expect(shifted.pipeline.content.season.endDate).toBe('2027-09-15');

    const repeated = first.pipeline.content.materialSets
      .flatMap((materialSet) => materialSet.cards)
      .find((card) =>
        card.annotations.some(
          (annotation) => annotation.type === 'uniqueEnding' && annotation.sourceTarget.occurrenceIndex > 1,
        ),
      );
    if (!repeated) {
      throw new Error('expected a repeated unique ending');
    }
    const domain = mapFirestoreCardToDomain(
      {
        seasonId: repeated.seasonId,
        materialSetId: repeated.materialSetId,
        cardId: repeated.cardId,
        cardNumber: repeated.cardNumber,
        reference: repeated.reference,
        verseText: repeated.verseText,
        sectionId: repeated.sectionId,
        tags: repeated.tags,
        studyContext: repeated.studyContext,
        annotations: repeated.annotations,
      },
      repeated.seasonId,
      repeated.materialSetId,
      repeated.cardId,
    );
    expect(domain.verseText).toBe(repeated.verseText);
    expect(domain.reference).toBe(repeated.reference);
    expect(domain.cardId).toBe(repeated.cardId);
    expect(domain.annotations).toEqual(repeated.annotations);
    expect(workbookHashes()).toEqual(WORKBOOK_SHA256);
  });
});
