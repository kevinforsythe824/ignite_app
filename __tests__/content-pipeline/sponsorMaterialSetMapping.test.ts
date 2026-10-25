/**
 * @jest-environment node
 */
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { buildOfficialSponsorDraft } from '../../scripts/content-pipeline/buildOfficialSponsorDraft';
import { OFFICIAL_CONTENT_SCHEMA_VERSION } from '../../scripts/content-pipeline/constants';
import { canonicalize, fingerprintContent } from '../../scripts/content-pipeline/fingerprint';
import {
  deriveCurriculumSectionId,
  mapSponsorVerseListToWorkbooks,
} from '../../scripts/content-pipeline/mapSponsorVerseList';
import {
  official2027DraftSeason,
  officialDraftSourceVersion,
} from '../../scripts/content-pipeline/officialDraftPackage';
import { runPipelineFromWorkbooks } from '../../scripts/content-pipeline/pipeline';
import {
  WPFBQ_2027_CADET_WORKBOOK_SOURCE,
  WPFBQ_2027_SPONSOR_PROFILE,
  type SponsorMaterialSetTarget,
  type SponsorSourceProfile,
} from '../../scripts/content-pipeline/sponsorSourceProfile';
import {
  SPONSOR_VERSE_LIST_COLUMNS,
  SPONSOR_VERSE_LIST_SHEET,
  type SponsorVerseList,
  type SponsorVerseListRow,
} from '../../scripts/content-pipeline/sponsorSourceTypes';
import { validateSourceWorkbook } from '../../scripts/content-pipeline/validateSource';

/**
 * Provisional dates for pipeline tests only.
 * They are not sponsor-confirmed season dates and are not builder defaults.
 */
const PROVISIONAL_TEST_SEASON_DATES = {
  startDate: '2027-09-01',
  endDate: '2028-06-30',
} as const;

const RULES_VERSION = '1.0 (2026-07-29)';

function testSeason() {
  const resolved = official2027DraftSeason(RULES_VERSION, PROVISIONAL_TEST_SEASON_DATES);
  if (!resolved.ok) {
    throw new Error(resolved.errors.map((item) => item.reason).join('\n'));
  }
  return resolved.season;
}

const SEASON = testSeason();

const SECTION_TITLES = [
  'Prepare Yourself for Battle',
  'Helmet of Salvation',
  'The Belt of Truth',
  'Breastplate of Righteousness',
  'Shoes of the Gospel of Peace',
  'Shield of Faith',
  'Sword of the Spirit',
] as const;

const SENIOR_TARGETS: readonly SponsorMaterialSetTarget[] = [
  { divisionId: 'intermediate', materialSetId: 'intermediate-2027' },
  { divisionId: 'experienced', materialSetId: 'experienced-2027' },
];

function row(
  seq: number,
  section: string,
  extras: Partial<SponsorVerseListRow> & { includeTopic?: boolean } = {},
): SponsorVerseListRow {
  const { includeTopic = true, ...rest } = extras;
  return {
    sourceRow: seq + 1,
    seq,
    section,
    reference: `Ref ${seq}`,
    verseText: `Alpha  line ${seq}; keep.`,
    ...(includeTopic ? { topic: `Topic ${seq}` } : {}),
    ...rest,
  };
}

function verseList(workbookName: string, rows: readonly SponsorVerseListRow[]): SponsorVerseList {
  const sections: string[] = [];
  for (const entry of rows) {
    if (!sections.includes(entry.section)) {
      sections.push(entry.section);
    }
  }
  return {
    workbookName,
    sheetName: SPONSOR_VERSE_LIST_SHEET,
    rows,
    sections,
  };
}

function sevenSectionRows(): SponsorVerseListRow[] {
  const rows = SECTION_TITLES.map((title, index) => {
    const seq = index + 1;
    if (seq === 1) {
      return row(seq, title);
    }
    if (seq % 2 === 0) {
      return row(seq, title, { battlefield: seq, question: `Prompt ${seq}?` });
    }
    return row(seq, title, { battlefield: `Field ${seq}`, question: `Prompt ${seq}?` });
  });
  rows.push(row(8, SECTION_TITLES[0], { battlefield: 8, question: 'Prompt 8?' }));
  rows.push(row(9, SECTION_TITLES[0], { battlefield: 0, question: 'Prompt 9?' }));
  rows.push(row(10, SECTION_TITLES[0], { battlefield: '10', question: 'Prompt 10?' }));
  return rows;
}

function expectMapped(list: SponsorVerseList, materialSets: readonly SponsorMaterialSetTarget[]) {
  const mapped = mapSponsorVerseListToWorkbooks({ verseList: list, materialSets, season: SEASON });
  if (!mapped.ok) {
    throw new Error(mapped.errors.map((item) => item.reason).join('\n'));
  }
  return mapped.workbooks;
}

describe('sponsor verse list mapping', () => {
  it('derives stable section ids and fails closed on a slug collision', () => {
    expect(deriveCurriculumSectionId('Shield of Faith')).toBe('shield-of-faith');
    expect(deriveCurriculumSectionId('Shield of Faith')).toBe(
      deriveCurriculumSectionId('Shield of Faith'),
    );

    const collided = mapSponsorVerseListToWorkbooks({
      verseList: verseList('collision.xlsx', [
        row(1, 'Red Sea'),
        row(2, 'Red-Sea'),
      ]),
      materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
      season: SEASON,
    });
    expect(collided.ok).toBe(false);
    if (collided.ok) {
      return;
    }
    expect(collided.errors[0]).toMatchObject({
      code: 'section_id_collision',
      workbook: 'collision.xlsx',
      sheet: 'Verse List',
      row: 3,
      field: 'Section',
    });
    expect(collided.errors[0]?.reason).toContain('not merged');
  });

  it('keeps an exact duplicate title as one section', () => {
    const workbooks = expectMapped(
      verseList('duplicate.xlsx', [row(1, 'Shield of Faith'), row(2, 'Shield of Faith')]),
      [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
    );
    expect(workbooks[0]?.sections).toHaveLength(1);
    expect(workbooks[0]?.sections[0]?.title).toBe('Shield of Faith');
    expect(workbooks[0]?.cards.map((card) => card.sectionId)).toEqual([
      'shield-of-faith',
      'shield-of-faith',
    ]);
  });

  it('fails closed on case variants instead of merging them', () => {
    const collided = mapSponsorVerseListToWorkbooks({
      verseList: verseList('case.xlsx', [row(1, 'Shield of Faith'), row(2, 'shield of faith')]),
      materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
      season: SEASON,
    });
    expect(collided.ok).toBe(false);
    if (collided.ok) {
      return;
    }
    expect(collided.errors[0]).toMatchObject({
      code: 'section_id_collision',
      workbook: 'case.xlsx',
      sheet: 'Verse List',
      row: 3,
      field: 'Section',
    });
    expect(collided.errors[0]?.reason).toContain('not merged');
  });

  it('fails closed when punctuation-only titles slug to the same id', () => {
    const collided = mapSponsorVerseListToWorkbooks({
      verseList: verseList('punct.xlsx', [row(1, '---'), row(2, '???')]),
      materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
      season: SEASON,
    });
    expect(collided.ok).toBe(false);
    if (collided.ok) {
      return;
    }
    expect(collided.errors[0]?.code).toBe('section_id_collision');
    expect(collided.errors[0]?.reason).toContain('not merged');
  });

  it('rejects an empty section title instead of assigning a fallback id', () => {
    for (const title of ['', '   ']) {
      const empty = mapSponsorVerseListToWorkbooks({
        verseList: verseList('empty-section.xlsx', [row(1, title)]),
        materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
        season: SEASON,
      });
      expect(empty.ok).toBe(false);
      if (empty.ok) {
        continue;
      }
      expect(empty.errors[0]).toMatchObject({
        code: 'empty_section_title',
        workbook: 'empty-section.xlsx',
        sheet: 'Verse List',
        row: 2,
        field: 'Section',
      });
      expect(empty.errors[0]?.reason).toContain('empty');
    }
  });

  it('keeps section order from first appearance, including titles outside the known seven', () => {
    const workbooks = expectMapped(
      verseList('custom.xlsx', [row(1, 'Zebra'), row(2, 'Apple'), row(3, 'Zebra', { battlefield: 3 })]),
      [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
    );
    expect(workbooks[0]?.sections.map((section) => section.title)).toEqual(['Zebra', 'Apple']);
    expect(workbooks[0]?.sections.map((section) => section.displayOrder)).toEqual([1, 2]);
    expect(workbooks[0]?.sections.map((section) => section.sectionId)).toEqual(['zebra', 'apple']);
  });

  it('maps card identity, exact text, seven sections, and study metadata without quiz hints', () => {
    const rows = sevenSectionRows();
    const [workbook] = expectMapped(verseList('beginner.xlsx', rows), [
      { divisionId: 'beginner', materialSetId: 'beginner-2027' },
    ]);
    if (!workbook) {
      throw new Error('expected a workbook');
    }

    expect(workbook.sections.map((section) => section.title)).toEqual([...SECTION_TITLES]);
    expect(workbook.sections.map((section) => section.sectionId)).toEqual(
      SECTION_TITLES.map((title) => deriveCurriculumSectionId(title)),
    );
    expect(workbook.annotations).toEqual([]);
    expect(workbook.quizMetadata).toEqual([]);
    expect(workbook.cards.map((card) => card.cardNumber)).toEqual(rows.map((entry) => entry.seq));

    const opening = workbook.cards[0];
    expect(opening?.verseText).toBe('Alpha  line 1; keep.');
    expect(opening?.reference).toBe('Ref 1');
    expect(opening?.cardId).toBeUndefined();
    expect(opening?.studyContext).toEqual({ topic: 'Topic 1' });
    expect(opening?.studyContext).not.toHaveProperty('battlefield');
    expect(opening?.studyContext).not.toHaveProperty('thematicQuestion');

    const numeric = workbook.cards[1]?.studyContext?.battlefield;
    const textual = workbook.cards[2]?.studyContext?.battlefield;
    expect(numeric).toBe(2);
    expect(typeof numeric).toBe('number');
    expect(textual).toBe('Field 3');
    expect(typeof textual).toBe('string');
    expect(workbook.cards[8]?.studyContext?.battlefield).toBe(0);
    expect(typeof workbook.cards[9]?.studyContext?.battlefield).toBe('string');
    expect(workbook.cards[1]?.studyContext?.thematicQuestion).toBe('Prompt 2?');

    const pipeline = runPipelineFromWorkbooks([workbook], { requireAllOfficialDivisions: false });
    expect(pipeline.status).toBe('passed');
    const cards = pipeline.content?.materialSets[0]?.cards ?? [];
    expect(cards.map((card) => card.cardId)).toEqual(rows.map((entry) => `c${entry.seq}`));
    const openingSection = pipeline.content?.materialSets[0]?.sections[0];
    expect(openingSection?.cardIds).toEqual(['c1', 'c8', 'c9', 'c10']);
    for (const card of cards) {
      expect(card.annotations).toEqual([]);
      expect(card.quizMetadata).toBeUndefined();
      expect(card.verseText).toBe(`Alpha  line ${card.cardNumber}; keep.`);
    }
    expect(cards[1]?.studyContext?.thematicQuestion).toBe('Prompt 2?');
    expect(cards[1]?.quizMetadata).toBeUndefined();
  });

  it('emits four MaterialSets from three sources and does not share Senior card objects', () => {
    const beginner = expectMapped(verseList('WPFBQ_2027_Beginner_Data_Workbook.xlsx', [row(1, 'One'), row(2, 'Two', { battlefield: 2 })]), [
      { divisionId: 'beginner', materialSetId: 'beginner-2027' },
    ]);
    const junior = expectMapped(
      verseList('WPFBQ_2027_Junior_Data_Workbook.xlsx', [
        row(1, 'One', { battlefield: 'North' }),
        row(2, 'Two', { battlefield: 'South' }),
        row(3, 'Three', { battlefield: 'East' }),
      ]),
      [{ divisionId: 'junior', materialSetId: 'junior-2027' }],
    );
    const seniorList = verseList('WPFBQ_2027_Senior_Data_Workbook.xlsx', sevenSectionRows());
    const senior = expectMapped(seniorList, SENIOR_TARGETS);
    const intermediateWorkbook = senior[0];
    const experiencedWorkbook = senior[1];
    if (!intermediateWorkbook || !experiencedWorkbook) {
      throw new Error('expected both Senior targets');
    }

    expect(intermediateWorkbook.cards[0]).not.toBe(experiencedWorkbook.cards[0]);
    expect(intermediateWorkbook.sections[0]).not.toBe(experiencedWorkbook.sections[0]);
    expect(intermediateWorkbook.cards[0]?.studyContext).not.toBe(experiencedWorkbook.cards[0]?.studyContext);
    const experiencedVerse = experiencedWorkbook.cards[0]?.verseText;
    const experiencedTitle = experiencedWorkbook.sections[0]?.title;
    const intermediateVerse = intermediateWorkbook.cards[0]?.verseText;
    const intermediateTitle = intermediateWorkbook.sections[0]?.title;
    const intermediateTopic = intermediateWorkbook.cards[1]?.studyContext?.topic;
    if (intermediateWorkbook.cards[0]) {
      intermediateWorkbook.cards[0].verseText = 'changed';
    }
    if (intermediateWorkbook.sections[0]) {
      intermediateWorkbook.sections[0].title = 'changed title';
    }
    if (intermediateWorkbook.cards[1]?.studyContext) {
      intermediateWorkbook.cards[1].studyContext.topic = 'changed topic';
    }
    expect(experiencedWorkbook.cards[0]?.verseText).toBe(experiencedVerse);
    expect(experiencedWorkbook.sections[0]?.title).toBe(experiencedTitle);
    expect(experiencedWorkbook.cards[1]?.studyContext?.topic).toBe('Topic 2');
    if (intermediateWorkbook.cards[0] && intermediateVerse) {
      intermediateWorkbook.cards[0].verseText = intermediateVerse;
    }
    if (intermediateWorkbook.sections[0] && intermediateTitle) {
      intermediateWorkbook.sections[0].title = intermediateTitle;
    }
    if (intermediateWorkbook.cards[1]?.studyContext && intermediateTopic) {
      intermediateWorkbook.cards[1].studyContext.topic = intermediateTopic;
    }

    const pipeline = runPipelineFromWorkbooks(
      [...beginner, ...junior, ...senior],
      { requireAllOfficialDivisions: false },
    );
    expect(pipeline.status).toBe('passed');
    expect(pipeline.report.errors).toEqual([]);
    const content = pipeline.content;
    if (!content) {
      throw new Error('expected package content');
    }
    expect(content.schemaVersion).toBe(OFFICIAL_CONTENT_SCHEMA_VERSION);
    expect(content.season.status).toBe('draft');
    expect(content.season).not.toHaveProperty('igniteAvailabilityDate');
    expect(content.materialSets.map((materialSet) => materialSet.materialSetId)).toEqual([
      'beginner-2027',
      'junior-2027',
      'intermediate-2027',
      'experienced-2027',
    ]);
    expect(content.materialSets.map((materialSet) => materialSet.cards.length)).toEqual([2, 3, 10, 10]);
    expect(content.materialSets.some((materialSet) => materialSet.divisionId === 'cadet')).toBe(false);

    const intermediate = content.materialSets.find((materialSet) => materialSet.materialSetId === 'intermediate-2027');
    const experienced = content.materialSets.find((materialSet) => materialSet.materialSetId === 'experienced-2027');
    const left = intermediate?.cards[0];
    const right = experienced?.cards[0];
    if (!left || !right || !intermediate || !experienced) {
      throw new Error('expected Senior package cards');
    }
    expect(left).not.toBe(right);
    expect(intermediate.sections[0]).not.toBe(experienced.sections[0]);
    expect(intermediate.sections[0]?.cardIds).not.toBe(experienced.sections[0]?.cardIds);
    expect(left.cardId).toBe('c1');
    expect(right.cardId).toBe('c1');
    expect(left.verseText).toBe(right.verseText);
    const fingerprint = fingerprintContent(content);
    const again = runPipelineFromWorkbooks([...beginner, ...junior, ...senior], {
      requireAllOfficialDivisions: false,
    });
    if (!again.content) {
      throw new Error('expected a second package');
    }
    expect(fingerprintContent(again.content)).toBe(fingerprint);
    expect(canonicalize(content)).not.toContain('content/authoring');
    expect(canonicalize(content)).not.toContain('/Users/');
    left.verseText = 'package changed';
    (intermediate.sections[0]?.cardIds as string[] | undefined)?.push('c999');
    expect(right.verseText).toBe('Alpha  line 1; keep.');
    expect(experienced.sections[0]?.cardIds).not.toContain('c999');
    expect(fingerprintContent(content)).not.toBe(fingerprint);

    for (const materialSet of content.materialSets) {
      for (const card of materialSet.cards) {
        expect(card.annotations).toEqual([]);
      }
    }
    expect(intermediate.sections).toHaveLength(7);
    expect(experienced.sections).toHaveLength(7);

    const strict = runPipelineFromWorkbooks([...beginner, ...junior, ...senior]);
    expect(strict.status).toBe('failed');
    expect(strict.report.errors.some((item) => item.code === 'material_set_count')).toBe(true);
  });

  it('does not invent Cadet from the 2027 profile and can map a future Cadet target', () => {
    expect(
      WPFBQ_2027_SPONSOR_PROFILE.sources.flatMap((source) =>
        source.materialSets.map((target) => target.divisionId),
      ),
    ).toEqual(['beginner', 'junior', 'intermediate', 'experienced']);

    const empty = mapSponsorVerseListToWorkbooks({
      verseList: verseList('empty.xlsx', [row(1, 'Only')]),
      materialSets: [],
      season: SEASON,
    });
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.errors[0]?.code).toBe('missing_material_set_target');
    }

    const cadet = mapSponsorVerseListToWorkbooks({
      verseList: verseList(WPFBQ_2027_CADET_WORKBOOK_SOURCE.fileName, [row(1, 'Future')]),
      materialSets: WPFBQ_2027_CADET_WORKBOOK_SOURCE.materialSets,
      season: SEASON,
    });
    expect(cadet.ok).toBe(true);
    if (cadet.ok) {
      expect(cadet.workbooks[0]?.materialSet).toMatchObject({
        materialSetId: 'cadet-2027',
        divisionId: 'cadet',
      });
      expect(cadet.workbooks[0]?.cards).toHaveLength(1);
    }
  });

  it('names the workbook, sheet, row, and field when study metadata is malformed', () => {
    const [workbook] = expectMapped(verseList('beginner.xlsx', sevenSectionRows()), [
      { divisionId: 'beginner', materialSetId: 'beginner-2027' },
    ]);
    if (!workbook) {
      throw new Error('expected a workbook');
    }
    const card = workbook.cards[1];
    if (!card) {
      throw new Error('expected a card');
    }
    card.studyContext = { battlefield: '' };
    const errors = validateSourceWorkbook(workbook);
    expect(errors[0]).toMatchObject({
      code: 'invalid_study_context',
      workbook: 'beginner.xlsx',
      sheet: 'Cards',
      row: card.sourceRow,
      field: 'studyContext.battlefield',
    });
  });

  it('rejects an impossible calendar date and an end before the start', () => {
    const [workbook] = expectMapped(verseList('beginner.xlsx', sevenSectionRows()), [
      { divisionId: 'beginner', materialSetId: 'beginner-2027' },
    ]);
    if (!workbook) {
      throw new Error('expected a workbook');
    }
    workbook.package = { ...workbook.package, startDate: '2027-02-31' };
    const impossible = validateSourceWorkbook(workbook);
    expect(impossible.some((item) => item.code === 'invalid_date' && item.field === 'startDate')).toBe(
      true,
    );
    expect(impossible.find((item) => item.field === 'startDate')?.reason).toContain('not a real calendar date');

    workbook.package = { ...workbook.package, startDate: '2028-06-30', endDate: '2027-09-01' };
    const reversed = validateSourceWorkbook(workbook);
    expect(reversed.some((item) => item.code === 'invalid_date_range' && item.field === 'endDate')).toBe(
      true,
    );
  });
});

async function writeTinyWorkbook(
  directory: string,
  fileName: string,
  rulesVersion: string,
  battlefield: ExcelJS.CellValue | null,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('Summary');
  summary.getCell('A1').value = 'Rules version';
  summary.getCell('B1').value = rulesVersion;
  const sheet = workbook.addWorksheet('Verse List');
  SPONSOR_VERSE_LIST_COLUMNS.forEach((header, index) => {
    sheet.getRow(1).getCell(index + 1).value = header;
  });
  const values: Record<string, ExcelJS.CellValue> = {
    Seq: 1,
    Section: 'Only Section',
    Topic: 'Topic',
    Reference: 'Sample 1:1',
    'Verse Text': 'Alpha  line;',
  };
  if (battlefield !== null) {
    values.Battlefield = battlefield;
  }
  SPONSOR_VERSE_LIST_COLUMNS.forEach((header, index) => {
    const value = values[header];
    if (value !== undefined) {
      sheet.getRow(2).getCell(index + 1).value = value;
    }
  });
  await workbook.xlsx.writeFile(path.join(directory, fileName));
}

describe('official sponsor draft builder', () => {
  it('reads three workbooks once, writes schema 1.1.0, and keeps the season draft', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-sponsor-draft-'));
    try {
      const rulesVersion = '1.0 (2026-07-29)';
      await writeTinyWorkbook(directory, 'beginner.xlsx', rulesVersion, 4);
      await writeTinyWorkbook(directory, 'junior.xlsx', rulesVersion, 'North');
      await writeTinyWorkbook(directory, 'senior.xlsx', rulesVersion, 9);
      const profile = {
        seasonId: '2027',
        sources: [
          {
            sourceId: 'beginner',
            fileName: 'beginner.xlsx',
            materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
          },
          {
            sourceId: 'junior',
            fileName: 'junior.xlsx',
            materialSets: [{ divisionId: 'junior', materialSetId: 'junior-2027' }],
          },
          {
            sourceId: 'senior',
            fileName: 'senior.xlsx',
            materialSets: SENIOR_TARGETS,
          },
        ],
      } as const satisfies SponsorSourceProfile;

      const draft = await buildOfficialSponsorDraft({
        directory,
        profile,
        seasonDates: PROVISIONAL_TEST_SEASON_DATES,
      });
      expect(draft.status).toBe('passed');
      expect(draft.workbookReadCount).toBe(3);
      expect(draft.loads).toHaveLength(3);
      expect(draft.rulesVersion).toBe(rulesVersion);
      expect(draft.pipeline.content?.schemaVersion).toBe('1.1.0');
      expect(draft.pipeline.content?.sourceVersion).toBe(officialDraftSourceVersion(rulesVersion));
      expect(draft.pipeline.content?.sourceVersion.includes(PROVISIONAL_TEST_SEASON_DATES.startDate)).toBe(
        false,
      );
      expect(draft.pipeline.content?.season).toMatchObject({
        status: 'draft',
        startDate: PROVISIONAL_TEST_SEASON_DATES.startDate,
        endDate: PROVISIONAL_TEST_SEASON_DATES.endDate,
      });
      expect(draft.pipeline.content?.season.startDate).not.toBe('2027-01-01');
      expect(draft.pipeline.content?.season.endDate).not.toBe('2027-12-31');
      expect(draft.pipeline.content?.materialSets).toHaveLength(4);
      expect(canonicalize(draft.pipeline.content)).not.toContain(directory);
      const seniorLoad = draft.loads.find((load) => load.source.fileName === 'senior.xlsx');
      expect(seniorLoad?.source.materialSets).toHaveLength(2);
      expect(seniorLoad?.verseList.rows).toHaveLength(1);
      const intermediate = draft.pipeline.content?.materialSets.find(
        (materialSet) => materialSet.materialSetId === 'intermediate-2027',
      );
      const experienced = draft.pipeline.content?.materialSets.find(
        (materialSet) => materialSet.materialSetId === 'experienced-2027',
      );
      expect(intermediate?.cards[0]).not.toBe(experienced?.cards[0]);
      expect(intermediate?.cards[0]?.studyContext?.battlefield).toBe(9);
      expect(typeof intermediate?.cards[0]?.studyContext?.battlefield).toBe('number');
      const junior = draft.pipeline.content?.materialSets.find(
        (materialSet) => materialSet.materialSetId === 'junior-2027',
      );
      expect(junior?.cards[0]?.studyContext?.battlefield).toBe('North');
      expect(typeof junior?.cards[0]?.studyContext?.battlefield).toBe('string');
      const fingerprint = draft.pipeline.content ? fingerprintContent(draft.pipeline.content) : '';
      const shifted = await buildOfficialSponsorDraft({
        directory,
        profile,
        seasonDates: { startDate: '2027-09-01', endDate: '2028-07-15' },
      });
      expect(shifted.status).toBe('passed');
      expect(shifted.pipeline.content?.sourceVersion).toBe(draft.pipeline.content?.sourceVersion);
      if (!shifted.pipeline.content) {
        throw new Error('expected a package with shifted test dates');
      }
      expect(fingerprintContent(shifted.pipeline.content)).not.toBe(fingerprint);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('fails when sponsor rules versions disagree', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'ignite-sponsor-rules-'));
    try {
      await writeTinyWorkbook(directory, 'beginner.xlsx', '1.0 (2026-07-29)', 1);
      await writeTinyWorkbook(directory, 'junior.xlsx', '1.0 (2026-07-29)', 'North');
      await writeTinyWorkbook(directory, 'senior.xlsx', '9.9 (1999-01-01)', 1);
      const profile = {
        seasonId: '2027',
        sources: [
          {
            sourceId: 'beginner',
            fileName: 'beginner.xlsx',
            materialSets: [{ divisionId: 'beginner', materialSetId: 'beginner-2027' }],
          },
          {
            sourceId: 'junior',
            fileName: 'junior.xlsx',
            materialSets: [{ divisionId: 'junior', materialSetId: 'junior-2027' }],
          },
          {
            sourceId: 'senior',
            fileName: 'senior.xlsx',
            materialSets: SENIOR_TARGETS,
          },
        ],
      } as const satisfies SponsorSourceProfile;
      const draft = await buildOfficialSponsorDraft({
        directory,
        profile,
        seasonDates: PROVISIONAL_TEST_SEASON_DATES,
      });
      expect(draft.status).toBe('failed');
      expect(draft.workbookReadCount).toBe(3);
      expect(draft.pipeline.content).toBeUndefined();
      expect(draft.pipeline.report.errors.some((item) => item.code === 'rules_version_mismatch')).toBe(
        true,
      );
      expect(draft.pipeline.report.errors.some((item) => item.workbook === 'senior.xlsx')).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('rejects missing, malformed, and reversed season dates before reading workbooks', async () => {
    const cases: Array<{
      label: string;
      seasonDates?: { startDate?: string; endDate?: string };
      code: string;
      field: string;
      reason: string;
    }> = [
      {
        label: 'no season config',
        seasonDates: undefined,
        code: 'missing_season_dates',
        field: 'seasonDates',
        reason: 'requires explicit season startDate and endDate',
      },
      {
        label: 'missing start',
        seasonDates: { endDate: '2028-06-30' },
        code: 'missing_required_field',
        field: 'startDate',
        reason: 'startDate is required',
      },
      {
        label: 'missing end',
        seasonDates: { startDate: '2027-09-01' },
        code: 'missing_required_field',
        field: 'endDate',
        reason: 'endDate is required',
      },
      {
        label: 'invalid format',
        seasonDates: { startDate: '09/01/2027', endDate: '2028-06-30' },
        code: 'invalid_date',
        field: 'startDate',
        reason: 'must be an ISO calendar date',
      },
      {
        label: 'impossible calendar date',
        seasonDates: { startDate: '2027-02-31', endDate: '2028-06-30' },
        code: 'invalid_date',
        field: 'startDate',
        reason: 'not a real calendar date',
      },
      {
        label: 'end before start',
        seasonDates: { startDate: '2028-06-30', endDate: '2027-09-01' },
        code: 'invalid_date_range',
        field: 'endDate',
        reason: 'is before startDate',
      },
    ];

    for (const entry of cases) {
      const draft = await buildOfficialSponsorDraft({
        directory: 'not-read',
        seasonDates: entry.seasonDates,
      });
      expect(draft.status).toBe('failed');
      expect(draft.workbookReadCount).toBe(0);
      expect(draft.pipeline.content).toBeUndefined();
      const match = draft.pipeline.report.errors.find(
        (item) => item.code === entry.code && item.field === entry.field,
      );
      if (!match) {
        throw new Error(
          `${entry.label} did not fail with ${entry.code} on ${entry.field}. Got: ${draft.pipeline.report.errors
            .map((item) => `${item.code} ${item.field ?? ''}`)
            .join('; ')}`,
        );
      }
      expect(match.reason).toContain(entry.reason);
    }

    const valid = official2027DraftSeason(RULES_VERSION, PROVISIONAL_TEST_SEASON_DATES);
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.season).toMatchObject({
        status: 'draft',
        startDate: PROVISIONAL_TEST_SEASON_DATES.startDate,
        endDate: PROVISIONAL_TEST_SEASON_DATES.endDate,
        sourceVersion: officialDraftSourceVersion(RULES_VERSION),
      });
      expect(valid.season.sourceVersion.includes('/')).toBe(false);
    }
  });
});
