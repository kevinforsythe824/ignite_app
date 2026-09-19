/**
 * Canonical Flashcard study unit (PRD §12).
 * Identity is seasonId + materialSetId + cardId — never a global verse reference.
 */
export interface CardMatchedRule {
  ruleName: string;
  ruleCategory: string;
  notes: string;
}

export interface Card {
  seasonId: string;
  materialSetId: string;
  cardId: string;
  cardNumber: number;
  reference: string;
  verseText: string;
  indexCode: string;
  matchedRules: CardMatchedRule[];
  tags: string[];
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
