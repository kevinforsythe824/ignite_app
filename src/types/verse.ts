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

export interface VerseSegment {
  type: SegmentType;
  content: string;
}

export type CardStatus = 'unseen' | 'mastered' | 'practicing';
