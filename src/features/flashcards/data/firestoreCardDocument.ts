/**
 * Persistence shape of a Card at the Phase 1 flat path:
 *   seasons/{seasonId}/cards/{cardId}
 *
 * Path identity is still (seasonId, cardId). Domain Cards also receive a
 * caller-supplied materialSetId stamp until Phase 2 nests materialSets.
 * This is not the application Card domain model.
 */
export interface FirestoreMatchedRule {
  rule_name: string;
  rule_category: string;
  notes: string;
}

export interface FirestoreCardDocument {
  card_number: number;
  reference: string;
  verse_text: string;
  index_code: string;
  matched_rules: FirestoreMatchedRule[];
  tags: string[];
}
