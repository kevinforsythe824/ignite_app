export type StudyStackParamList = {
  StudyHub: undefined;
  /** Omit sectionId to study the full MaterialSet. */
  FlashcardStudy: { sectionId?: string } | undefined;
  /** Selected MaterialSet comes from the Study curriculum gate. */
  AnnotatedScriptureList: undefined;
};
