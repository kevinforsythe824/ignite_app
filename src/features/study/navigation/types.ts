export type StudyStackParamList = {
  StudyHub: undefined;
  /** Omit sectionId to study the full MaterialSet. */
  FlashcardStudy: { sectionId?: string } | undefined;
};
