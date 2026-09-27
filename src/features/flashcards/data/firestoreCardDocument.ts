/**
 * Legacy flat seed document used by scripts/firestore-seed.
 * Study runtime does not read this shape.
 *   seasons/{seasonId}/cards/{cardId}
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

/**
 * Canonical nested Card document:
 *   seasons/{seasonId}/materialSets/{materialSetId}/cards/{cardId}
 * This is not the application Card domain model.
 */
export interface CanonicalFirestoreCardAnnotation {
  annotationId: string;
  cardId?: string;
  type: string;
  sourceTarget: {
    strategy: string;
    phrase?: string;
    occurrenceIndex?: number;
  };
  resolvedTarget: {
    start: number;
    end: number;
  };
  notes?: string;
}

export interface CanonicalFirestoreQuizMetadata {
  pointValue?: number;
  questionHint?: string;
  cardId?: string;
}

export interface CanonicalFirestoreCrossReference {
  fromCardId?: string;
  toReference?: string;
  toCardId?: string;
  notes?: string;
}

export interface CanonicalFirestoreCardDocument {
  seasonId: string;
  materialSetId: string;
  cardId: string;
  cardNumber: number;
  reference: string;
  verseText: string;
  sectionId: string;
  tags?: string[];
  annotations?: CanonicalFirestoreCardAnnotation[];
  indexCode?: string;
  quizMetadata?: CanonicalFirestoreQuizMetadata;
  crossReferences?: CanonicalFirestoreCrossReference[];
}
