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
/** Frequency class on a frequency annotation. Other annotation types do not carry a tier. */
export const FREQUENCY_TIER_VALUES = [1, 2, 3, 4, 5] as const;

export type FrequencyTier = (typeof FREQUENCY_TIER_VALUES)[number];

export function isFrequencyTier(value: unknown): value is FrequencyTier {
  return (
    typeof value === 'number' &&
    (FREQUENCY_TIER_VALUES as readonly number[]).includes(value)
  );
}

export interface CardAnnotation {
  annotationId: string;
  /** Required. Must equal the owning card's cardId. */
  cardId: string;
  type: string;
  sourceTarget: CardAnnotationSourceTarget;
  resolvedTarget: CardAnnotationSpan;
  notes?: string;
  /**
   * Present on frequency annotations in content schema 1.1.0.
   * Schema 1.0.0 frequency annotations may omit it. Other types never have it.
   */
  frequencyTier?: FrequencyTier;
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

/**
 * Battlefield stays a number or text, matching the sponsor cell.
 * A blank cell is omitted. It is not stored as 0 or an empty string.
 */
export type StudyBattlefield = string | number;

/**
 * Sponsor study organization stored on the card.
 * thematicQuestion is the sponsor Question column. It is not a quiz hint.
 */
export interface CardStudyContext {
  battlefield?: StudyBattlefield;
  topic?: string;
  thematicQuestion?: string;
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
  /** Omitted when the sponsor row had no battlefield, topic, or thematic question. */
  studyContext?: CardStudyContext;
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
