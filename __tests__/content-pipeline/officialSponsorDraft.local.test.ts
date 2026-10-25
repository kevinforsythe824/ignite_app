/**
 * @jest-environment node
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { buildOfficialSponsorDraft } from '../../scripts/content-pipeline/buildOfficialSponsorDraft';
import { fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import { deriveCurriculumSectionId } from '../../scripts/content-pipeline/mapSponsorVerseList';
import { officialDraftSourceVersion } from '../../scripts/content-pipeline/officialDraftPackage';
import { WPFBQ_2027_SPONSOR_PROFILE } from '../../scripts/content-pipeline/sponsorSourceProfile';
import type { SponsorVerseListRow } from '../../scripts/content-pipeline/sponsorSourceTypes';
import type { ContentCardRecord, ContentMaterialSetRecord } from '../../scripts/content-pipeline/types';

/**
 * Provisional dates for this local verification only.
 * They are not sponsor-confirmed season dates and are not builder defaults.
 */
const PROVISIONAL_LOCAL_TEST_SEASON_DATES = {
  startDate: '2027-09-01',
  endDate: '2028-06-30',
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

function assertPreserved(card: ContentCardRecord, row: SponsorVerseListRow, materialSetId: string): void {
  const label = `${materialSetId} seq ${row.seq} source row ${row.sourceRow}`;
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
  if (card.annotations.length !== 0) {
    throw new Error(`${label} has annotations.`);
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

function assertMaterialSet(materialSet: ContentMaterialSetRecord, rows: readonly SponsorVerseListRow[]): void {
  expect(materialSet.sections).toHaveLength(7);
  expect(materialSet.sections.map((section) => section.title)).toEqual([...SECTION_TITLES]);
  expect(materialSet.sections.map((section) => section.displayOrder)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(materialSet.sections.map((section) => section.sectionId)).toEqual(
    SECTION_TITLES.map((title) => deriveCurriculumSectionId(title)),
  );
  expect(materialSet.cards).toHaveLength(rows.length);
  materialSet.cards.forEach((card, index) => {
    const row = rows[index];
    if (!row) {
      throw new Error(`${materialSet.materialSetId} is missing source row ${index + 1}.`);
    }
    assertPreserved(card, row, materialSet.materialSetId);
    expect(card.sectionId).toBe(deriveCurriculumSectionId(row.section));
  });
  for (const section of materialSet.sections) {
    const expected = rows.filter((row) => row.section === section.title).map((row) => `c${row.seq}`);
    expect(section.cardIds).toEqual(expected);
  }
}

(WORKBOOKS_PRESENT ? describe : describe.skip)('local official sponsor workbooks', () => {
  jest.setTimeout(120000);

  it('maps 150/250/392/392 cards from one read of each workbook', async () => {
    const draft = await buildOfficialSponsorDraft({
      directory: LOCAL_DIR,
      seasonDates: PROVISIONAL_LOCAL_TEST_SEASON_DATES,
    });
    expect(draft.status).toBe('passed');
    expect(draft.pipeline.report.errors).toEqual([]);
    expect(draft.workbookReadCount).toBe(3);
    expect(draft.loads).toHaveLength(3);
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
    expect(content.season.startDate).not.toBe('2027-01-01');
    expect(content.season.endDate).not.toBe('2027-12-31');
    expect(content.season).not.toHaveProperty('igniteAvailabilityDate');
    expect(content.season).not.toHaveProperty('sourceMaterialReleaseDate');
    expect(content.sourceVersion).toBe(officialDraftSourceVersion('1.0 (2026-07-29)'));
    expect(content.sourceVersion.includes('/')).toBe(false);
    expect(content.sourceVersion.includes('\\')).toBe(false);
    expect(content.materialSets.map((materialSet) => materialSet.divisionId)).toEqual([
      'beginner',
      'junior',
      'intermediate',
      'experienced',
    ]);
    expect(content.materialSets.some((materialSet) => materialSet.divisionId === 'cadet')).toBe(false);

    const byId = new Map(content.materialSets.map((materialSet) => [materialSet.materialSetId, materialSet]));
    const beginnerLoad = draft.loads.find((load) => load.source.sourceId === 'beginner');
    const juniorLoad = draft.loads.find((load) => load.source.sourceId === 'junior');
    const seniorLoad = draft.loads.find((load) => load.source.sourceId === 'senior');
    const beginner = byId.get('beginner-2027');
    const junior = byId.get('junior-2027');
    const intermediate = byId.get('intermediate-2027');
    const experienced = byId.get('experienced-2027');
    if (!beginnerLoad || !juniorLoad || !seniorLoad || !beginner || !junior || !intermediate || !experienced) {
      throw new Error('expected three reads and four MaterialSets');
    }

    expect(seniorLoad.source.materialSets.map((target) => target.materialSetId)).toEqual([
      'intermediate-2027',
      'experienced-2027',
    ]);
    expect(beginnerLoad.verseList.rows).toHaveLength(150);
    expect(juniorLoad.verseList.rows).toHaveLength(250);
    expect(junior.cards.map((card) => card.cardNumber)).toEqual(
      Array.from({ length: 250 }, (_, index) => index + 1),
    );
    expect(seniorLoad.verseList.rows).toHaveLength(392);
    assertMaterialSet(beginner, beginnerLoad.verseList.rows);
    assertMaterialSet(junior, juniorLoad.verseList.rows);
    assertMaterialSet(intermediate, seniorLoad.verseList.rows);
    assertMaterialSet(experienced, seniorLoad.verseList.rows);
    expect(beginner.cards.length + junior.cards.length + intermediate.cards.length + experienced.cards.length).toBe(
      1184,
    );

    expect(beginner.cards.some((card) => typeof card.studyContext?.battlefield === 'number')).toBe(true);
    expect(beginner.cards.some((card) => card.studyContext?.battlefield === undefined)).toBe(true);
    expect(junior.cards.some((card) => typeof card.studyContext?.battlefield === 'string')).toBe(true);
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
    const saved = experienced.cards[0]?.verseText;
    const savedTopic = experienced.cards[0]?.studyContext?.topic;
    const savedMembership = [...(experienced.sections[0]?.cardIds ?? [])];
    if (intermediate.cards[0]) {
      intermediate.cards[0].verseText = 'mutated';
      if (intermediate.cards[0].studyContext) {
        intermediate.cards[0].studyContext.topic = 'mutated topic';
      }
    }
    (intermediate.sections[0]?.cardIds as string[] | undefined)?.push('c999');
    expect(experienced.cards[0]?.verseText).toBe(saved);
    expect(experienced.cards[0]?.studyContext?.topic).toBe(savedTopic);
    expect(experienced.sections[0]?.cardIds).toEqual(savedMembership);
    expect(experienced.sections[0]?.cardIds).not.toContain('c999');

    const second = await buildOfficialSponsorDraft({
      directory: LOCAL_DIR,
      seasonDates: PROVISIONAL_LOCAL_TEST_SEASON_DATES,
    });
    expect(second.workbookReadCount).toBe(3);
    if (!second.pipeline.content) {
      throw new Error('expected a second package');
    }
    expect(fingerprintContent(second.pipeline.content)).toBe(fingerprint);
  });
});
