import type { CurriculumSection } from '../../src/features/season/domain/curriculumSection';
import type { DivisionId } from '../../src/features/season/domain/division';
import type { MaterialSet } from '../../src/features/season/domain/materialSet';
import type { Season } from '../../src/features/season/domain/season';
import type {
  AnnotationTargetStrategy,
  SyntheticAnnotationType,
} from './constants';

/** Human-authored Package sheet row. */
export interface PackageRow {
  seasonId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  sourceVersion: string;
  schemaVersion: string;
  sourceMaterialReleaseDate?: string;
  igniteAvailabilityDate?: string;
}

/** Human-authored MaterialSet sheet row. */
export interface MaterialSetRow {
  seasonId: string;
  materialSetId: string;
  divisionId: string;
  displayName: string;
}

/** Human-authored Sections sheet row. */
export interface SectionRow {
  sectionId: string;
  title: string;
  displayOrder: number;
  description?: string;
}

/** Human-authored Cards sheet row. */
export interface CardRow {
  cardNumber: number;
  reference: string;
  verseText: string;
  sectionId: string;
  cardId?: string;
  indexCode?: string;
  tags?: string;
}

/** Human-authored Annotations sheet row. */
export interface AnnotationRow {
  cardNumber?: number;
  cardId?: string;
  type: string;
  strategy: string;
  phrase?: string;
  /**
   * 1-based occurrence of phrase in the verse.
   * Optional when the exact phrase occurs once. Required when it occurs more than once.
   * A blank cell is omitted, not malformed.
   */
  occurrenceIndex?: number;
  notes?: string;
}

/** Human-authored QuizMetadata sheet row. */
export interface QuizMetadataRow {
  cardNumber?: number;
  cardId?: string;
  pointValue?: number;
  questionHint?: string;
}

/** Human-authored CrossReferences sheet row. */
export interface CrossReferenceRow {
  fromCardNumber?: number;
  fromCardId?: string;
  toReference?: string;
  toCardNumber?: number;
  toCardId?: string;
  notes?: string;
}

export interface AuthoringWorkbookData {
  workbookName: string;
  package: PackageRow;
  materialSet: MaterialSetRow;
  sections: SectionRow[];
  cards: CardRow[];
  annotations: AnnotationRow[];
  quizMetadata: QuizMetadataRow[];
  crossReferences: CrossReferenceRow[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning';
  code: string;
  reason: string;
  workbook?: string;
  sheet?: string;
  row?: number;
  field?: string;
}

export interface PhraseOccurrenceTarget {
  strategy: 'phraseOccurrence';
  phrase: string;
  /**
   * 1-based index among non-overlapping exact matches.
   * Normalized packages always store this explicitly, including 1 when the
   * author left a unique phrase's occurrenceIndex blank.
   */
  occurrenceIndex: number;
}

/**
 * Extensible source-target abstraction.
 * Phase 2A.1 implements phraseOccurrence only.
 * Phase 2B may add official committee mapping strategies without
 * changing Card identity, package ownership, or presentation architecture.
 */
export type AnnotationSourceTarget = PhraseOccurrenceTarget;

export interface ResolvedAnnotationSpan {
  start: number;
  end: number;
}

export interface ContentAnnotationRecord {
  annotationId: string;
  cardId: string;
  /** Synthetic/DEV vocabulary — not official committee notation. */
  type: SyntheticAnnotationType;
  sourceTarget: AnnotationSourceTarget;
  resolvedTarget: ResolvedAnnotationSpan;
  notes?: string;
}

export interface ContentQuizMetadata {
  cardId: string;
  pointValue?: number;
  questionHint?: string;
}

export interface ContentCrossReference {
  fromCardId: string;
  toReference?: string;
  toCardId?: string;
  notes?: string;
}

export interface ContentCardRecord {
  seasonId: string;
  materialSetId: string;
  cardId: string;
  cardNumber: number;
  reference: string;
  verseText: string;
  sectionId: string;
  indexCode?: string;
  tags: string[];
  annotations: ContentAnnotationRecord[];
  quizMetadata?: Omit<ContentQuizMetadata, 'cardId'>;
  crossReferences: ContentCrossReference[];
}

export interface ContentMaterialSetRecord extends MaterialSet {
  sections: CurriculumSection[];
  cards: ContentCardRecord[];
}

/**
 * Normalized content IR — Firebase-independent.
 * Spreadsheet row shapes do not appear here.
 */
export interface ContentIR {
  schemaVersion: string;
  sourceVersion: string;
  season: Season;
  materialSets: ContentMaterialSetRecord[];
  source: {
    workbookNames: string[];
  };
}

/** Canonical generated package logical content (fingerprint input). */
export interface ContentPackage {
  schemaVersion: string;
  sourceVersion: string;
  season: Season;
  materialSets: ContentMaterialSetRecord[];
}

export interface PackageManifestMaterialSet {
  materialSetId: string;
  divisionId: DivisionId;
  displayName: string;
  sectionCount: number;
  cardCount: number;
  annotationCount: number;
}

export interface PackageManifest {
  schemaVersion: string;
  seasonId: string;
  sourceVersion: string;
  converterVersion: string;
  materialSets: PackageManifestMaterialSet[];
  cardCounts: {
    total: number;
    byMaterialSet: Record<string, number>;
  };
  fingerprint: string;
  validationStatus: 'passed' | 'failed';
  generatedAt: string;
}

export interface ReconciliationCounts {
  sourceCardCount: number;
  generatedCardCount: number;
  cardsPerMaterialSet: Record<string, number>;
  cardsPerSection: Record<string, number>;
  annotationsPerMaterialSet: Record<string, number>;
  annotationsPerType: Record<string, number>;
}

export interface ReconciliationReport {
  counts: ReconciliationCounts;
  unmappedSourceValues: string[];
  mismatches: string[];
}

export interface ValidationReport {
  status: 'passed' | 'failed';
  schemaVersion: string;
  seasonId?: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  reconciliation?: ReconciliationReport;
}

export type AnnotationTargetStrategyName = AnnotationTargetStrategy;
