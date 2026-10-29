/**
 * @jest-environment node
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildOfficialSponsorDraft } from '../../scripts/content-pipeline/buildOfficialSponsorDraft';
import { fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import { deriveCurriculumSectionId } from '../../scripts/content-pipeline/mapSponsorVerseList';
import { officialDraftSourceVersion } from '../../scripts/content-pipeline/officialDraftPackage';
import {
  findPhraseOccurrences,
  resolveAnnotationTarget,
} from '../../scripts/content-pipeline/resolveAnnotationTarget';
import {
  SPONSOR_FREQUENCY_MAX_TIER,
  SPONSOR_FREQUENCY_MIN_TIER,
  type SponsorFrequencyWords,
} from '../../scripts/content-pipeline/sponsorFrequencyTypes';
import { WPFBQ_2027_SPONSOR_PROFILE } from '../../scripts/content-pipeline/sponsorSourceProfile';
import type { SponsorVerseListRow } from '../../scripts/content-pipeline/sponsorSourceTypes';
import {
  leadingPunctuationLength,
  trailingPunctuationLength,
} from '../../scripts/content-pipeline/sponsorWordMatch';
import type { ContentCardRecord, ContentMaterialSetRecord } from '../../scripts/content-pipeline/types';
import { validateOfficialSponsorDraftInMemory } from '../../scripts/content-pipeline/validateOfficialDraft';
import { validateContentPackage } from '../../scripts/content-pipeline/validatePackage';

/**
 * Caller-supplied 2027 study dates for the local official draft.
 * The builder does not default these, and it does not invent igniteAvailabilityDate.
 */
const PROVISIONAL_LOCAL_TEST_SEASON_DATES = {
  startDate: '2027-01-01',
  endDate: '2027-08-31',
} as const;

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

const EXPECTED_ANNOTATIONS = {
  cadet: { annotations: 296, repeatedEndings: 3 },
  beginner: { annotations: 741, repeatedEndings: 9 },
  junior: { annotations: 1643, repeatedEndings: 16 },
  senior: { annotations: 2704, repeatedEndings: 20 },
} as const;

const LOCAL_DIR = path.join('content', 'authoring', 'local');
const WORKBOOKS_PRESENT = WPFBQ_2027_SPONSOR_PROFILE.sources.every((source) =>
  existsSync(path.join(LOCAL_DIR, source.fileName)),
);

const SECTION_TITLES = [
  'Prepare Yourself for Battle',
  'Helmet of Salvation',
  'The Belt of Truth',
  'Breastplate of Righteousness',
  'Shoes of the Gospel of Peace',
  'Shield of Faith',
  'Sword of the Spirit',
] as const;

function expectWorkbookHashesUnchanged(): void {
  for (const source of WPFBQ_2027_SPONSOR_PROFILE.sources) {
    const hash = createHash('sha256').update(readFileSync(path.join(LOCAL_DIR, source.fileName))).digest('hex');
    expect(hash).toBe(WORKBOOK_SHA256[source.fileName]);
  }
}

function cardLabel(materialSetId: string, row: SponsorVerseListRow): string {
  return `${materialSetId} seq ${row.seq} source row ${row.sourceRow}`;
}

function assertPreserved(card: ContentCardRecord, row: SponsorVerseListRow, materialSetId: string): void {
  const label = cardLabel(materialSetId, row);
  if (card.cardNumber !== row.seq || card.cardId !== `c${row.seq}`) {
    throw new Error(`${label} identity changed.`);
  }
  if (card.reference !== row.reference) {
    throw new Error(
      `${label} reference mismatch (lengths ${row.reference.length} and ${card.reference.length}).`,
    );
  }
  if (card.verseText !== row.verseText) {
    throw new Error(
      `${label} verseText mismatch (lengths ${row.verseText.length} and ${card.verseText.length}).`,
    );
  }
  if (card.quizMetadata !== undefined) {
    throw new Error(`${label} has quiz metadata.`);
  }
  const context = card.studyContext;
  if ((context?.battlefield !== row.battlefield) || typeof context?.battlefield !== typeof row.battlefield) {
    throw new Error(`${label} battlefield changed (${typeof row.battlefield} vs ${typeof context?.battlefield}).`);
  }
  if (context?.topic !== row.topic) {
    throw new Error(`${label} topic changed.`);
  }
  if (context?.thematicQuestion !== row.question) {
    throw new Error(`${label} thematic question changed.`);
  }
  if (row.battlefield === undefined && context && Object.prototype.hasOwnProperty.call(context, 'battlefield')) {
    throw new Error(`${label} stored a blank battlefield.`);
  }
  if (row.question === undefined && context && Object.prototype.hasOwnProperty.call(context, 'thematicQuestion')) {
    throw new Error(`${label} stored a blank thematic question.`);
  }
}

function assertOfficialAnnotations(
  card: ContentCardRecord,
  row: SponsorVerseListRow,
  materialSetId: string,
  referenced: ReadonlySet<string>,
): boolean {
  const label = cardLabel(materialSetId, row);
  if (!row.uniqueBeginning || !row.uniqueEnding) {
    throw new Error(`${label} is missing a unique beginning or unique ending.`);
  }
  const beginnings = card.annotations.filter((annotation) => annotation.type === 'uniqueBeginning');
  const endings = card.annotations.filter((annotation) => annotation.type === 'uniqueEnding');
  if (beginnings.length !== 1 || endings.length !== 1 || card.annotations.length < 2) {
    throw new Error(
      `${label} has ${beginnings.length} unique beginnings, ${endings.length} unique endings, and ${card.annotations.length} annotations.`,
    );
  }
  const beginning = beginnings[0];
  const ending = endings[0];
  if (!beginning || !ending) {
    throw new Error(`${label} is missing a boundary annotation.`);
  }
  if (beginning.sourceTarget.phrase !== row.uniqueBeginning || beginning.sourceTarget.occurrenceIndex !== 1) {
    throw new Error(`${label} unique beginning was not targeted at occurrence 1.`);
  }
  if (ending.sourceTarget.phrase !== row.uniqueEnding) {
    throw new Error(`${label} unique ending phrase does not match the Verse List.`);
  }
  if (beginning.frequencyTier !== undefined || ending.frequencyTier !== undefined) {
    throw new Error(`${label} has a frequency tier on a boundary annotation.`);
  }
  const beginMatches = findPhraseOccurrences(card.verseText, beginning.sourceTarget.phrase);
  if (beginMatches.length !== 1 || beginMatches[0]?.start !== leadingPunctuationLength(card.verseText)) {
    throw new Error(`${label} unique beginning is not the single opening occurrence.`);
  }
  const endMatches = findPhraseOccurrences(card.verseText, ending.sourceTarget.phrase);
  const expectedEnd = card.verseText.length - trailingPunctuationLength(card.verseText);
  const selected = endMatches[ending.sourceTarget.occurrenceIndex - 1];
  if (
    !selected ||
    selected.end !== expectedEnd ||
    endMatches.filter((match) => match.end === expectedEnd).length !== 1
  ) {
    throw new Error(`${label} unique ending was not the occurrence at the verse suffix.`);
  }
  const frequency = card.annotations.filter((annotation) => annotation.type === 'frequency');
  if (referenced.has(row.reference)) {
    if (frequency.length === 0) {
      throw new Error(`${label} is listed in All Frequency Words but has no frequency annotation.`);
    }
  } else if (frequency.length !== 0) {
    throw new Error(`${label} has a frequency annotation but is not listed in All Frequency Words.`);
  }
  for (const annotation of card.annotations) {
    const phrase = annotation.sourceTarget.phrase;
    if (card.verseText.slice(annotation.resolvedTarget.start, annotation.resolvedTarget.end) !== phrase) {
      throw new Error(`${label} ${annotation.type} slice does not equal its phrase.`);
    }
    const resolved = resolveAnnotationTarget({
      verseText: card.verseText,
      sourceTarget: annotation.sourceTarget,
    });
    if (
      resolved.error ||
      resolved.resolved?.start !== annotation.resolvedTarget.start ||
      resolved.resolved?.end !== annotation.resolvedTarget.end
    ) {
      throw new Error(`${label} ${annotation.type} did not round-trip.`);
    }
    if (
      annotation.type === 'frequency' &&
      (annotation.frequencyTier === undefined ||
        annotation.frequencyTier < SPONSOR_FREQUENCY_MIN_TIER ||
        annotation.frequencyTier > SPONSOR_FREQUENCY_MAX_TIER)
    ) {
      throw new Error(`${label} frequency annotation is missing a tier.`);
    }
  }
  return ending.sourceTarget.occurrenceIndex > 1;
}

function assertMaterialSet(
  materialSet: ContentMaterialSetRecord,
  rows: readonly SponsorVerseListRow[],
  frequencyWords: SponsorFrequencyWords,
  expected: { readonly annotations: number; readonly repeatedEndings: number },
): void {
  expect(materialSet.sections).toHaveLength(7);
  expect(materialSet.sections.map((section) => section.title)).toEqual([...SECTION_TITLES]);
  expect(materialSet.sections.map((section) => section.displayOrder)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(materialSet.sections.map((section) => section.sectionId)).toEqual(
    SECTION_TITLES.map((title) => deriveCurriculumSectionId(title)),
  );
  expect(materialSet.cards).toHaveLength(rows.length);
  const referenced = new Set(frequencyWords.entries.flatMap((entry) => [...entry.references]));
  let repeatedEndings = 0;
  materialSet.cards.forEach((card, index) => {
    const row = rows[index];
    if (!row) {
      throw new Error(`${materialSet.materialSetId} is missing source row ${index + 1}.`);
    }
    assertPreserved(card, row, materialSet.materialSetId);
    if (assertOfficialAnnotations(card, row, materialSet.materialSetId, referenced)) {
      repeatedEndings += 1;
    }
    expect(card.sectionId).toBe(deriveCurriculumSectionId(row.section));
  });
  expect(repeatedEndings).toBe(expected.repeatedEndings);
  const total = materialSet.cards.reduce((sum, card) => sum + card.annotations.length, 0);
  const occurrenceTotal = frequencyWords.entries.reduce((sum, entry) => sum + entry.occurrences, 0);
  expect(total).toBe(rows.length * 2 + occurrenceTotal);
  expect(total).toBe(expected.annotations);
  for (let tier = SPONSOR_FREQUENCY_MIN_TIER; tier <= SPONSOR_FREQUENCY_MAX_TIER; tier += 1) {
    const fromSheet = frequencyWords.entries
      .filter((entry) => entry.tier === tier)
      .reduce((sum, entry) => sum + entry.occurrences, 0);
    const fromCards = materialSet.cards.reduce(
      (sum, card) =>
        sum +
        card.annotations.filter(
          (annotation) => annotation.type === 'frequency' && annotation.frequencyTier === tier,
        ).length,
      0,
    );
    expect(fromCards).toBe(fromSheet);
  }
  for (const section of materialSet.sections) {
    const expectedCardIds = rows.filter((row) => row.section === section.title).map((row) => `c${row.seq}`);
    expect(section.cardIds).toEqual(expectedCardIds);
  }
}

(WORKBOOKS_PRESENT ? describe : describe.skip)('local official sponsor workbooks', () => {
  jest.setTimeout(180000);

  it('maps 50/150/250/392/392 cards from one read of each workbook', async () => {
    expectWorkbookHashesUnchanged();
    const draft = await buildOfficialSponsorDraft({
      directory: LOCAL_DIR,
      seasonDates: PROVISIONAL_LOCAL_TEST_SEASON_DATES,
    });
    expect(draft.status).toBe('passed');
    expect(draft.pipeline.report.errors).toEqual([]);
    expect(draft.workbookReadCount).toBe(4);
    expect(draft.loads).toHaveLength(4);
    expect(draft.loads.map((load) => load.source.sourceId)).toEqual([
      'cadet',
      'beginner',
      'junior',
      'senior',
    ]);
    expect(draft.rulesVersion).toBe('1.0 (2026-07-29)');
    const content = draft.pipeline.content;
    if (!content) {
      throw new Error(draft.pipeline.report.errors.map((item) => item.reason).join('\n'));
    }

    expect(content.schemaVersion).toBe('1.1.0');
    expect(content.season).toMatchObject({
      seasonId: '2027',
      status: 'draft',
      name: '2027 official draft',
      startDate: PROVISIONAL_LOCAL_TEST_SEASON_DATES.startDate,
      endDate: PROVISIONAL_LOCAL_TEST_SEASON_DATES.endDate,
    });
    expect(content.season.endDate).not.toBe('2027-12-31');
    expect(content.season).not.toHaveProperty('igniteAvailabilityDate');
    expect(content.season).not.toHaveProperty('sourceMaterialReleaseDate');
    expect(content.sourceVersion).toBe(officialDraftSourceVersion('1.0 (2026-07-29)'));
    expect(content.sourceVersion.includes('/')).toBe(false);
    expect(content.sourceVersion.includes('\\')).toBe(false);
    expect(content.materialSets.map((materialSet) => materialSet.divisionId)).toEqual([
      'cadet',
      'beginner',
      'junior',
      'intermediate',
      'experienced',
    ]);
    expect(content.materialSets.map((materialSet) => materialSet.materialSetId)).toEqual([
      'cadet-2027',
      'beginner-2027',
      'junior-2027',
      'intermediate-2027',
      'experienced-2027',
    ]);

    const byId = new Map(content.materialSets.map((materialSet) => [materialSet.materialSetId, materialSet]));
    const cadetLoad = draft.loads.find((load) => load.source.sourceId === 'cadet');
    const beginnerLoad = draft.loads.find((load) => load.source.sourceId === 'beginner');
    const juniorLoad = draft.loads.find((load) => load.source.sourceId === 'junior');
    const seniorLoad = draft.loads.find((load) => load.source.sourceId === 'senior');
    const cadet = byId.get('cadet-2027');
    const beginner = byId.get('beginner-2027');
    const junior = byId.get('junior-2027');
    const intermediate = byId.get('intermediate-2027');
    const experienced = byId.get('experienced-2027');
    if (
      !cadetLoad ||
      !beginnerLoad ||
      !juniorLoad ||
      !seniorLoad ||
      !cadet ||
      !beginner ||
      !junior ||
      !intermediate ||
      !experienced
    ) {
      throw new Error('expected four reads and five MaterialSets');
    }

    expect(seniorLoad.source.materialSets.map((target) => target.materialSetId)).toEqual([
      'intermediate-2027',
      'experienced-2027',
    ]);
    expect(cadetLoad.verseList.rows).toHaveLength(50);
    expect(cadetLoad.verseList.sections).toHaveLength(7);
    expect(beginnerLoad.verseList.rows).toHaveLength(150);
    expect(juniorLoad.verseList.rows).toHaveLength(250);
    expect(junior.cards.map((card) => card.cardNumber)).toEqual(
      Array.from({ length: 250 }, (_, index) => index + 1),
    );
    expect(seniorLoad.verseList.rows).toHaveLength(392);
    assertMaterialSet(cadet, cadetLoad.verseList.rows, cadetLoad.frequencyWords, EXPECTED_ANNOTATIONS.cadet);
    assertMaterialSet(beginner, beginnerLoad.verseList.rows, beginnerLoad.frequencyWords, EXPECTED_ANNOTATIONS.beginner);
    assertMaterialSet(junior, juniorLoad.verseList.rows, juniorLoad.frequencyWords, EXPECTED_ANNOTATIONS.junior);
    assertMaterialSet(intermediate, seniorLoad.verseList.rows, seniorLoad.frequencyWords, EXPECTED_ANNOTATIONS.senior);
    assertMaterialSet(experienced, seniorLoad.verseList.rows, seniorLoad.frequencyWords, EXPECTED_ANNOTATIONS.senior);
    expect(validateContentPackage(content)).toEqual([]);
    expect(
      cadet.cards.length +
        beginner.cards.length +
        junior.cards.length +
        intermediate.cards.length +
        experienced.cards.length,
    ).toBe(1234);
    const annotationTotal = content.materialSets.reduce(
      (sum, materialSet) =>
        sum + materialSet.cards.reduce((cardSum, card) => cardSum + card.annotations.length, 0),
      0,
    );
    expect(annotationTotal).toBe(8088);
    expect(draft.pipeline.manifest?.cardCounts.total).toBe(1234);
    expect(draft.pipeline.manifest?.schemaVersion).toBe('1.1.0');
    expect(draft.pipeline.manifest?.seasonId).toBe('2027');
    expect(draft.pipeline.manifest?.sourceVersion).toBe(content.sourceVersion);
    expect(draft.pipeline.manifest?.validationStatus).toBe('passed');
    expect(
      draft.pipeline.manifest?.materialSets.map((materialSet) => [
        materialSet.materialSetId,
        materialSet.divisionId,
        materialSet.cardCount,
        materialSet.annotationCount,
      ]),
    ).toEqual([
      ['cadet-2027', 'cadet', 50, 296],
      ['beginner-2027', 'beginner', 150, 741],
      ['junior-2027', 'junior', 250, 1643],
      ['intermediate-2027', 'intermediate', 392, 2704],
      ['experienced-2027', 'experienced', 392, 2704],
    ]);

    const cadetFrequencyTiers = new Set(
      cadet.cards.flatMap((card) =>
        card.annotations
          .filter((annotation) => annotation.type === 'frequency')
          .map((annotation) => annotation.frequencyTier),
      ),
    );
    expect([...cadetFrequencyTiers]).toEqual([1]);
    expect(
      cadet.cards.reduce(
        (sum, card) => sum + card.annotations.filter((annotation) => annotation.type === 'frequency').length,
        0,
      ),
    ).toBe(196);
    expect(
      cadet.cards
        .filter((card) =>
          card.annotations.some(
            (annotation) => annotation.type === 'uniqueEnding' && annotation.sourceTarget.occurrenceIndex > 1,
          ),
        )
        .map((card) => card.reference)
        .sort(),
    ).toEqual(['2 Corinthians 10:3', 'Ephesians 6:13', 'Psalm 56:10']);
    const leadingCadet = cadet.cards.filter((card) => leadingPunctuationLength(card.verseText) > 0);
    expect(leadingCadet.map((card) => card.reference)).toEqual(['2 Corinthians 5:7']);
    expect(
      leadingCadet[0]?.annotations.find((annotation) => annotation.type === 'uniqueBeginning')?.sourceTarget.phrase.startsWith(
        '(',
      ),
    ).toBe(false);

    expect(cadet.cards.some((card) => typeof card.studyContext?.battlefield === 'number')).toBe(true);
    expect(cadet.cards.some((card) => card.studyContext?.battlefield === undefined)).toBe(true);
    expect(beginner.cards.some((card) => typeof card.studyContext?.battlefield === 'number')).toBe(true);
    expect(beginner.cards.some((card) => card.studyContext?.battlefield === undefined)).toBe(true);
    expect(junior.cards.some((card) => typeof card.studyContext?.battlefield === 'string')).toBe(true);
    expect(
      cadet.cards.every(
        (card) =>
          card.studyContext?.battlefield === undefined || typeof card.studyContext.battlefield === 'number',
      ),
    ).toBe(true);
    expect(
      beginner.cards.every(
        (card) =>
          card.studyContext?.battlefield === undefined || typeof card.studyContext.battlefield === 'number',
      ),
    ).toBe(true);
    expect(
      junior.cards.every(
        (card) => card.studyContext?.battlefield === undefined || typeof card.studyContext.battlefield === 'string',
      ),
    ).toBe(true);

    expect(intermediate.cards[0]).not.toBe(experienced.cards[0]);
    expect(intermediate.sections[0]).not.toBe(experienced.sections[0]);
    expect(intermediate.sections[0]?.cardIds).not.toBe(experienced.sections[0]?.cardIds);
    if (intermediate.cards[0]?.studyContext || experienced.cards[0]?.studyContext) {
      expect(intermediate.cards[0]?.studyContext).not.toBe(experienced.cards[0]?.studyContext);
    }
    for (let index = 0; index < intermediate.cards.length; index += 1) {
      const left = intermediate.cards[index];
      const right = experienced.cards[index];
      if (!left || !right) {
        throw new Error(`Senior card index ${index} is missing from one MaterialSet.`);
      }
      expect(left).not.toBe(right);
      expect(left.annotations).toEqual(right.annotations);
      expect(left.annotations).not.toBe(right.annotations);
      left.annotations.forEach((annotation, annotationIndex) => {
        expect(annotation).not.toBe(right.annotations[annotationIndex]);
        expect(annotation.sourceTarget).not.toBe(right.annotations[annotationIndex]?.sourceTarget);
        expect(annotation.resolvedTarget).not.toBe(right.annotations[annotationIndex]?.resolvedTarget);
      });
      if (left.reference !== right.reference || left.verseText !== right.verseText) {
        throw new Error(
          `Senior card ${left.cardNumber} differs between intermediate and experienced (reference lengths ${left.reference.length}/${right.reference.length}, verse lengths ${left.verseText.length}/${right.verseText.length}).`,
        );
      }
      expect(left.studyContext).toEqual(right.studyContext);
      expect(left.sectionId).toBe(right.sectionId);
      if (left.studyContext && right.studyContext) {
        expect(left.studyContext).not.toBe(right.studyContext);
      }
    }
    const fingerprint = fingerprintContent(content);
    expect(draft.pipeline.manifest?.fingerprint).toBe(fingerprint);
    const saved = experienced.cards[0]?.verseText;
    const savedPhrase = experienced.cards[0]?.annotations[0]?.sourceTarget.phrase;
    const savedTopic = experienced.cards[0]?.studyContext?.topic;
    const savedMembership = [...(experienced.sections[0]?.cardIds ?? [])];
    if (intermediate.cards[0]) {
      intermediate.cards[0].verseText = 'mutated';
      if (intermediate.cards[0].studyContext) {
        intermediate.cards[0].studyContext.topic = 'mutated topic';
      }
      if (intermediate.cards[0].annotations[0]) {
        intermediate.cards[0].annotations[0].sourceTarget.phrase = 'mutated phrase';
      }
    }
    (intermediate.sections[0]?.cardIds as string[] | undefined)?.push('c999');
    expect(experienced.cards[0]?.verseText).toBe(saved);
    expect(experienced.cards[0]?.annotations[0]?.sourceTarget.phrase).toBe(savedPhrase);
    expect(experienced.cards[0]?.studyContext?.topic).toBe(savedTopic);
    expect(experienced.sections[0]?.cardIds).toEqual(savedMembership);
    expect(experienced.sections[0]?.cardIds).not.toContain('c999');

    const summary = await validateOfficialSponsorDraftInMemory({
      directory: LOCAL_DIR,
      seasonDates: PROVISIONAL_LOCAL_TEST_SEASON_DATES,
    });
    expect(summary.status).toBe('passed');
    expect(summary.workbookReadCount).toBe(4);
    expect(summary.totalCards).toBe(1234);
    expect(summary.totalAnnotations).toBe(8088);
    expect(summary.serializationMatches).toBe(true);
    expect(summary.strictPackageErrors).toEqual([]);
    expect(summary.manifestErrors).toEqual([]);
    expect(summary.fingerprint).toBe(fingerprint);
    expect(summary.seasonStatus).toBe('draft');
    expect(summary.materialSets.map((materialSet) => [materialSet.materialSetId, materialSet.cards, materialSet.annotations])).toEqual([
      ['cadet-2027', 50, 296],
      ['beginner-2027', 150, 741],
      ['junior-2027', 250, 1643],
      ['intermediate-2027', 392, 2704],
      ['experienced-2027', 392, 2704],
    ]);
    expectWorkbookHashesUnchanged();
  });
});
