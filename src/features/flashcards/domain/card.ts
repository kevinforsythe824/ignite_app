/**
 * Canonical Flashcard study unit (PRD §12).
 * Identity is seasonId + cardId — never a global verse reference.
 */
export interface CardMatchedRule {
  ruleName: string;
  ruleCategory: string;
  notes: string;
}

export interface Card {
  seasonId: string;
  cardId: string;
  cardNumber: number;
  reference: string;
  verseText: string;
  indexCode: string;
  matchedRules: CardMatchedRule[];
  tags: string[];
}

/** Stable composite key for Quizzer + Season + Card scoped state. */
export function makeCardKey(seasonId: string, cardId: string): string {
  return `${seasonId}:${cardId}`;
}
