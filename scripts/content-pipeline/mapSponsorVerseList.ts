import { getDivisionLabel, isDivisionId } from '../../src/features/season/domain/division';
import type { CardStudyContext } from '../../src/features/flashcards/domain/card';
import { OFFICIAL_CONTENT_SCHEMA_VERSION } from './constants';
import { issue } from './errors';
import type { OfficialDraftPackageInput } from './officialDraftPackage';
import type { SponsorMaterialSetTarget } from './sponsorSourceProfile';
import type { SponsorVerseList, SponsorVerseListRow } from './sponsorSourceTypes';
import { SPONSOR_VERSE_LIST_SHEET } from './sponsorSourceTypes';
import type { AnnotationRow, AuthoringWorkbookData, CardRow, SectionRow, ValidationIssue } from './types';

const SECTION_ID_FALLBACK = 'section';

/**
 * Stable section id from the exact title. Distinct titles that slug together
 * are a validation failure. They are not merged.
 */
export function deriveCurriculumSectionId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : SECTION_ID_FALLBACK;
}

function studyContextFromRow(row: SponsorVerseListRow): CardStudyContext | undefined {
  const studyContext: CardStudyContext = {};
  if (row.battlefield !== undefined) {
    studyContext.battlefield = row.battlefield;
  }
  if (row.topic !== undefined) {
    studyContext.topic = row.topic;
  }
  if (row.question !== undefined) {
    studyContext.thematicQuestion = row.question;
  }
  return Object.keys(studyContext).length > 0 ? studyContext : undefined;
}

interface BuiltSections {
  readonly sections: readonly SectionRow[];
  readonly sectionIdByTitle: ReadonlyMap<string, string>;
  readonly errors: readonly ValidationIssue[];
}

function buildSections(verseList: SponsorVerseList): BuiltSections {
  const sections: SectionRow[] = [];
  const sectionIdByTitle = new Map<string, string>();
  const titleBySectionId = new Map<string, string>();
  const errors: ValidationIssue[] = [];

  for (const row of verseList.rows) {
    if (row.section.trim().length === 0) {
      errors.push(
        issue({
          code: 'empty_section_title',
          workbook: verseList.workbookName,
          sheet: verseList.sheetName,
          row: row.sourceRow,
          field: 'Section',
          reason: 'Section title is empty. An empty title is not given a section id.',
        }),
      );
      continue;
    }
    if (sectionIdByTitle.has(row.section)) {
      continue;
    }
    const sectionId = deriveCurriculumSectionId(row.section);
    const previousTitle = titleBySectionId.get(sectionId);
    if (previousTitle !== undefined && previousTitle !== row.section) {
      errors.push(
        issue({
          code: 'section_id_collision',
          workbook: verseList.workbookName,
          sheet: verseList.sheetName,
          row: row.sourceRow,
          field: 'Section',
          reason: `Section titles "${previousTitle}" and "${row.section}" would share section id "${sectionId}". Distinct titles are not merged.`,
        }),
      );
      continue;
    }
    titleBySectionId.set(sectionId, row.section);
    sectionIdByTitle.set(row.section, sectionId);
    sections.push({
      sectionId,
      title: row.section,
      displayOrder: sections.length + 1,
      sourceRow: row.sourceRow,
    });
  }

  return { sections, sectionIdByTitle, errors };
}

function cloneAnnotationsForTarget(
  verseList: SponsorVerseList,
  annotationsByCardNumber: ReadonlyMap<number, readonly AnnotationRow[]> | undefined,
): AnnotationRow[] {
  const annotations: AnnotationRow[] = [];
  for (const row of verseList.rows) {
    const cardAnnotations = annotationsByCardNumber?.get(row.seq) ?? [];
    for (const annotation of cardAnnotations) {
      annotations.push({ ...annotation });
    }
  }
  return annotations;
}

function annotationCardErrors(
  verseList: SponsorVerseList,
  annotationsByCardNumber: ReadonlyMap<number, readonly AnnotationRow[]> | undefined,
): ValidationIssue[] {
  if (!annotationsByCardNumber) {
    return [];
  }
  const seqs = new Set(verseList.rows.map((row) => row.seq));
  const errors: ValidationIssue[] = [];
  for (const [cardNumber, cardAnnotations] of annotationsByCardNumber) {
    if (!seqs.has(cardNumber)) {
      errors.push(
        issue({
          code: 'unknown_annotation_card',
          workbook: verseList.workbookName,
          sheet: verseList.sheetName,
          field: 'cardNumber',
          reason: `Annotations refer to card ${cardNumber}, which is not a Verse List Seq.`,
        }),
      );
    }
    for (const annotation of cardAnnotations) {
      if (annotation.cardNumber !== cardNumber) {
        errors.push(
          issue({
            code: 'mismatched_annotation_card',
            workbook: verseList.workbookName,
            sheet: verseList.sheetName,
            row: annotation.sourceRow,
            field: 'cardNumber',
            reason: `Annotation card ${String(annotation.cardNumber)} does not match Verse List Seq ${cardNumber}.`,
          }),
        );
      }
    }
  }
  return errors;
}

function workbookForTarget(
  verseList: SponsorVerseList,
  target: SponsorMaterialSetTarget,
  sections: readonly SectionRow[],
  sectionIdByTitle: ReadonlyMap<string, string>,
  season: OfficialDraftPackageInput,
  annotationsByCardNumber: ReadonlyMap<number, readonly AnnotationRow[]> | undefined,
): AuthoringWorkbookData {
  const cards: CardRow[] = verseList.rows.map((row) => {
    const sectionId = sectionIdByTitle.get(row.section);
    if (!sectionId) {
      throw new Error(
        `Verse List row ${row.sourceRow} has section "${row.section}" after section validation failed closed.`,
      );
    }
    const studyContext = studyContextFromRow(row);
    const card: CardRow = {
      cardNumber: row.seq,
      reference: row.reference,
      verseText: row.verseText,
      sectionId,
      sourceRow: row.sourceRow,
    };
    if (studyContext) {
      card.studyContext = studyContext;
    }
    return card;
  });

  return {
    workbookName: verseList.workbookName,
    package: {
      seasonId: season.seasonId,
      name: season.name,
      startDate: season.startDate,
      endDate: season.endDate,
      status: season.status,
      sourceVersion: season.sourceVersion,
      schemaVersion: season.schemaVersion,
    },
    materialSet: {
      seasonId: season.seasonId,
      materialSetId: target.materialSetId,
      divisionId: target.divisionId,
      displayName: getDivisionLabel(target.divisionId),
    },
    sections: sections.map((section) => ({ ...section })),
    cards,
    annotations: cloneAnnotationsForTarget(verseList, annotationsByCardNumber),
    quizMetadata: [],
    crossReferences: [],
  };
}

export type SponsorVerseListMapResult =
  | { readonly ok: true; readonly workbooks: readonly AuthoringWorkbookData[] }
  | { readonly ok: false; readonly errors: readonly ValidationIssue[] };

/**
 * Copies one verified verse list into one authoring workbook per MaterialSet target.
 * Senior's two targets each receive new Card, Section, and Annotation objects.
 * Card ids are left blank so convert derives c{cardNumber}.
 * Omitted annotations stay empty. Provided annotations are cloned per target.
 */
export function mapSponsorVerseListToWorkbooks(input: {
  verseList: SponsorVerseList;
  materialSets: readonly SponsorMaterialSetTarget[];
  season: OfficialDraftPackageInput;
  annotationsByCardNumber?: ReadonlyMap<number, readonly AnnotationRow[]>;
}): SponsorVerseListMapResult {
  const { verseList, season } = input;
  if (season.schemaVersion !== OFFICIAL_CONTENT_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        issue({
          code: 'unsupported_schema_version',
          workbook: verseList.workbookName,
          sheet: SPONSOR_VERSE_LIST_SHEET,
          field: 'schemaVersion',
          reason: `Official sponsor mapping writes schema ${OFFICIAL_CONTENT_SCHEMA_VERSION}.`,
        }),
      ],
    };
  }
  if (season.status !== 'draft') {
    return {
      ok: false,
      errors: [
        issue({
          code: 'invalid_season_status',
          workbook: verseList.workbookName,
          sheet: SPONSOR_VERSE_LIST_SHEET,
          field: 'status',
          reason: 'Official sponsor mapping keeps the season draft.',
        }),
      ],
    };
  }
  if (input.materialSets.length === 0) {
    return {
      ok: false,
      errors: [
        issue({
          code: 'missing_material_set_target',
          workbook: verseList.workbookName,
          sheet: verseList.sheetName,
          reason:
            'Sponsor source has no MaterialSet target. A missing division, including Cadet, is not invented.',
        }),
      ],
    };
  }

  const targetErrors: ValidationIssue[] = [];
  for (const target of input.materialSets) {
    if (!isDivisionId(target.divisionId)) {
      targetErrors.push(
        issue({
          code: 'invalid_division_id',
          workbook: verseList.workbookName,
          sheet: verseList.sheetName,
          field: 'divisionId',
          reason: `Division ID "${String(target.divisionId)}" is not an official division.`,
        }),
      );
    }
    if (!target.materialSetId) {
      targetErrors.push(
        issue({
          code: 'missing_required_field',
          workbook: verseList.workbookName,
          sheet: verseList.sheetName,
          field: 'materialSetId',
          reason: 'MaterialSet ID is required.',
        }),
      );
    }
  }
  if (targetErrors.length > 0) {
    return { ok: false, errors: targetErrors };
  }

  const annotationErrors = annotationCardErrors(verseList, input.annotationsByCardNumber);
  if (annotationErrors.length > 0) {
    return { ok: false, errors: annotationErrors };
  }

  const built = buildSections(verseList);
  if (built.errors.length > 0) {
    return { ok: false, errors: built.errors };
  }

  const workbooks = input.materialSets.map((target) =>
    workbookForTarget(
      verseList,
      target,
      built.sections,
      built.sectionIdByTitle,
      season,
      input.annotationsByCardNumber,
    ),
  );
  return { ok: true, workbooks };
}
