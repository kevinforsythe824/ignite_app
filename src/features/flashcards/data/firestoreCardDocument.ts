/**
 * Persistence shape of a Card at:
 *   seasons/{seasonId}/cards/{cardId}
 *
 * Identity lives in the path (seasonId, cardId) — not duplicated on the document.
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
