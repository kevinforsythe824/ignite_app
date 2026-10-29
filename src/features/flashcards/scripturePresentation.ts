/**
 * Presentation-only scripture formatting mode.
 * Not a Card field, not persisted, and not a Firestore value.
 * Do not infer it from annotations, matchedRules, references, or division ids.
 */
export const SCRIPTURE_PRESENTATION_MODES = ['official', 'legacy'] as const;

export type ScripturePresentationMode = (typeof SCRIPTURE_PRESENTATION_MODES)[number];

/** Fixture sessions and direct mounts keep matchedRules until they opt into official. */
export const DEFAULT_SCRIPTURE_PRESENTATION: ScripturePresentationMode = 'legacy';
