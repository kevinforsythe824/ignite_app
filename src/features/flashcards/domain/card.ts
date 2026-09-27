/**
 * Canonical Flashcard study unit (PRD §12).
 * Identity is seasonId + materialSetId + cardId — never a global verse reference.
 */
export interface CardMatchedRule {
  ruleName: string;
  ruleCategory: string;
  notes: string;
}

/** Inclusive-exclusive character span in the owning card's verse text. */
export interface CardAnnotationSpan {
  start: number;
  end: number;
}

/**
 * Ignite-owned annotation target. `phraseOccurrence` is the package strategy
 * this slice stores. The type string is not closed over synthetic names.
 */
export const PHRASE_OCCURRENCE_STRATEGY = 'phraseOccurrence' as const;

export interface CardAnnotationSourceTarget {
  strategy: string;
  phrase?: string;
  occurrenceIndex?: number;
}

/**
 * Embedded card annotation. Presentation is later work — Study does not
 * render these or translate them into matchedRules.
 */
export interface CardAnnotation {
  annotationId: string;
  /** Required. Must equal the owning card's cardId. */
  cardId: string;
  type: string;
  sourceTarget: CardAnnotationSourceTarget;
  resolvedTarget: CardAnnotationSpan;
  notes?: string;
}

export interface CardQuizMetadata {
  pointValue?: number;
  questionHint?: string;
}

export interface CardCrossReference {
  toReference?: string;
  toCardId?: string;
  notes?: string;
}

export interface Card {
  seasonId: string;
  materialSetId: string;
  cardId: string;
  cardNumber: number;
  reference: string;
  verseText: string;
  /**
   * Competitive index code. Canonical package cards omit it.
   * Fixture cards still set it.
   */
  indexCode?: string;
  matchedRules: CardMatchedRule[];
  tags: string[];
  /**
   * Required on Firestore-mapped cards. Optional on the type so fixture and
   * test literals can omit it. The Firestore mapper always sets it.
   */
  sectionId?: string;
  annotations?: CardAnnotation[];
  quizMetadata?: CardQuizMetadata;
  crossReferences?: CardCrossReference[];
}

/**
 * Future Progress / RecallEvent identity (Sprint 6–7).
 * Type only — no persistence in Phase 1 (ADR-003).
 */
export type LearningCardRef = {
  seasonId: string;
  materialSetId: string;
  cardId: string;
};

/** Stable composite key for Quizzer + Season + MaterialSet + Card scoped state. */
export function makeCardKey(
  seasonId: string,
  materialSetId: string,
  cardId: string,
): string {
  return `${seasonId}:${materialSetId}:${cardId}`;
}
