/**
 * Early Season Setup routes. Answers stay on the provider, not on these params.
 * Region and Review are not routes in this slice.
 */
export type SeasonSetupStackParamList = {
  EligibilityAge: undefined;
  PlacementChoice: undefined;
  FirstYear: undefined;
  StudyTrack: undefined;
};

/** Fired when the next unresolved step is region. Phase 3C.3 registers that screen. */
export interface SeasonSetupRegionBoundary {
  readonly nextStep: 'region';
}
