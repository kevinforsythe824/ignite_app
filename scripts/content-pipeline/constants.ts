import { OFFICIAL_DIVISION_IDS } from '../../src/features/season/domain/division';

/**
 * Content-pipeline contract versions.
 * These identify the authoring workbook and generated-package schemas,
 * not official WPF season identifiers.
 */
export const CONTENT_SCHEMA_VERSION = '1.0.0';
export const WORKBOOK_SCHEMA_VERSION = '1.0.0';
export const CONVERTER_VERSION = '1.0.0';

export const SUPPORTED_CONTENT_SCHEMA_VERSIONS = [CONTENT_SCHEMA_VERSION] as const;

export const REQUIRED_WORKBOOK_SHEETS = [
  'README',
  'Package',
  'MaterialSet',
  'Sections',
  'Cards',
  'Annotations',
  'QuizMetadata',
  'CrossReferences',
] as const;

export type WorkbookSheetName = (typeof REQUIRED_WORKBOOK_SHEETS)[number];

export const PACKAGE_COLUMNS = [
  'seasonId',
  'name',
  'startDate',
  'endDate',
  'status',
  'sourceVersion',
  'schemaVersion',
  'sourceMaterialReleaseDate',
  'igniteAvailabilityDate',
] as const;

export const REQUIRED_PACKAGE_COLUMNS = [
  'seasonId',
  'name',
  'startDate',
  'endDate',
  'status',
  'sourceVersion',
  'schemaVersion',
] as const;

export const MATERIAL_SET_COLUMNS = [
  'seasonId',
  'materialSetId',
  'divisionId',
  'displayName',
] as const;

export const SECTION_COLUMNS = [
  'sectionId',
  'title',
  'displayOrder',
  'description',
] as const;

export const REQUIRED_SECTION_COLUMNS = ['sectionId', 'title', 'displayOrder'] as const;

export const CARD_COLUMNS = [
  'cardNumber',
  'reference',
  'verseText',
  'sectionId',
  'cardId',
  'indexCode',
  'tags',
] as const;

export const REQUIRED_CARD_COLUMNS = [
  'cardNumber',
  'reference',
  'verseText',
  'sectionId',
] as const;

export const ANNOTATION_COLUMNS = [
  'cardNumber',
  'cardId',
  'type',
  'strategy',
  'phrase',
  'occurrenceIndex',
  'notes',
] as const;

export const REQUIRED_ANNOTATION_COLUMNS = ['type', 'strategy'] as const;

export const QUIZ_METADATA_COLUMNS = [
  'cardNumber',
  'cardId',
  'pointValue',
  'questionHint',
] as const;

export const CROSS_REFERENCE_COLUMNS = [
  'fromCardNumber',
  'fromCardId',
  'toReference',
  'toCardNumber',
  'toCardId',
  'notes',
] as const;

/**
 * Synthetic/DEV annotation vocabulary for pipeline tests only.
 * Official committee annotation mapping is deferred to Phase 2B.
 */
export const SYNTHETIC_ANNOTATION_TYPES = [
  'highlight',
  'underline',
  'keyword',
  'uniqueBeginning',
  'uniqueEnding',
  'frequency',
  'crossReference',
] as const;

export type SyntheticAnnotationType = (typeof SYNTHETIC_ANNOTATION_TYPES)[number];

/** Phase 2A.1 supports only this source-target strategy. */
export const PHRASE_OCCURRENCE_STRATEGY = 'phraseOccurrence' as const;

export const SUPPORTED_ANNOTATION_STRATEGIES = [PHRASE_OCCURRENCE_STRATEGY] as const;

export type AnnotationTargetStrategy = (typeof SUPPORTED_ANNOTATION_STRATEGIES)[number];

export const SYNTHETIC_DATASET_LABEL = 'SYNTHETIC / DEV / NOT OFFICIAL MATERIAL';

export const SYNTHETIC_SEASON_ID = 'dev-synthetic-s3';
export const SYNTHETIC_SEASON_NAME = 'DEV Synthetic Sprint 3 — NOT OFFICIAL MATERIAL';
export const SYNTHETIC_SOURCE_VERSION = 'synthetic-1.0.0';

/** Clearly fabricated dates so this season cannot be mistaken for a live WPF year. */
export const SYNTHETIC_SEASON_START_DATE = '2099-01-01';
export const SYNTHETIC_SEASON_END_DATE = '2099-12-31';

export const DEFAULT_SYNTHETIC_SOURCE_DIR = 'content/authoring/synthetic';
export const DEFAULT_TEMPLATE_PATH =
  'content/authoring/templates/ignite-materialset-workbook-v1.xlsx';
export const DEFAULT_PACKAGE_ROOT = 'content/packages';

export const OFFICIAL_DIVISION_ORDER = OFFICIAL_DIVISION_IDS;

export function isSyntheticAnnotationType(
  value: unknown,
): value is SyntheticAnnotationType {
  return (
    typeof value === 'string' &&
    (SYNTHETIC_ANNOTATION_TYPES as readonly string[]).includes(value)
  );
}

export function isSupportedAnnotationStrategy(
  value: unknown,
): value is AnnotationTargetStrategy {
  return (
    typeof value === 'string' &&
    (SUPPORTED_ANNOTATION_STRATEGIES as readonly string[]).includes(value)
  );
}

export function isSupportedContentSchemaVersion(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    (SUPPORTED_CONTENT_SCHEMA_VERSIONS as readonly string[]).includes(value)
  );
}
