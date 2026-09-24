import type { CurriculumDocumentKind } from './paths';

export interface PlannedDocument {
  path: string;
  kind: CurriculumDocumentKind;
  data: Record<string, unknown>;
}

export interface ImportPlanCounts {
  seasons: number;
  materialSets: number;
  sections: number;
  cards: number;
  annotations: number;
}

export interface ImportPlan {
  seasonId: string;
  fingerprint: string;
  counts: ImportPlanCounts;
  documents: PlannedDocument[];
}

export interface StoredCurriculumDocument {
  path: string;
  data: Record<string, unknown>;
}

/** In-memory curriculum tree for one season. No write operations. */
export interface SeasonCurriculumSnapshot {
  seasonId: string;
  documents: StoredCurriculumDocument[];
}

export interface CurriculumReadPort {
  loadSeasonCurriculum(seasonId: string): Promise<SeasonCurriculumSnapshot>;
}

/**
 * Write seam for the in-memory orchestrator.
 * Production code must not add a Firestore implementation in Slice 4A.
 * Method names stay off the Firestore write-API scanner.
 */
export interface CurriculumWritePort {
  upsert(path: string, data: Record<string, unknown>): Promise<void>;
  remove(path: string): Promise<void>;
}

export type DiffClassification = 'CREATE' | 'UPDATE' | 'UNCHANGED' | 'DELETE';

export interface CurriculumDiffEntry {
  path: string;
  kind: CurriculumDocumentKind;
  classification: DiffClassification;
}

export type DiffOutcome = 'already-installed' | 'fingerprint-drift' | 'differences';

export interface CurriculumDiffReport {
  seasonId: string;
  packageFingerprint: string;
  installedFingerprint: string | null;
  entries: CurriculumDiffEntry[];
  counts: Record<DiffClassification, number>;
  fingerprintMatches: boolean;
  contentMatches: boolean;
  outcome: DiffOutcome;
}
