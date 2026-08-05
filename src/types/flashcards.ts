export type FlashcardCategoryFilter =
  | 'ALL'
  | 'UNIQUE_BEG'
  | 'UNIQUE_END'
  | 'QUESTIONS'
  | 'EXCLAMATIONS';

export type FlashcardDefaultSide = 'LOCATE' | 'QUOTE';

export interface FlashcardSettings {
  indexLegendFilter: string[];
  categoryFilter: FlashcardCategoryFilter;
  shuffleEnabled: boolean;
  playAudioEnabled: boolean;
  defaultSide: FlashcardDefaultSide;
}

export const DEFAULT_FLASHCARD_SETTINGS: FlashcardSettings = {
  indexLegendFilter: [],
  categoryFilter: 'ALL',
  shuffleEnabled: false,
  playAudioEnabled: false,
  defaultSide: 'LOCATE',
};
