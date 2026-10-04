/** Production Season clock. Tests inject a fixed instant instead of calling this. */
export function systemSeasonClock(): Date {
  return new Date();
}

export type SeasonClock = () => Date;
