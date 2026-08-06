export interface MatchedRule {
  rule_name: string;
  rule_category: string;
  notes: string;
}

export interface Verse {
  id: string;
  reference: string;
  verse_text: string;
  index_code: string;
  matched_rules: MatchedRule[];
  tags: string[];
}

export interface FlashcardDeck {
  deckId: string;
  title: string;
  verses: Verse[];
}

export type SegmentType =
  | 'text'
  | 'keyword1x'
  | 'keyword2x'
  | 'keyword3x'
  | 'highlight'
  | 'slash';

/**
 * Structural underlines from the index legend. A mark is independent of
 * `SegmentType` because it runs straight through highlighted keywords.
 */
export type VerseMark = 'uniqueBeginning' | 'uniqueEnding' | 'question' | 'exclamation';

export interface VerseSegment {
  type: SegmentType;
  content: string;
  mark?: VerseMark;
}

export type CardStatus = 'unseen' | 'mastered' | 'practicing';
