/**
 * Official competitive divisions (PRD §8.1).
 * Five only — there is no Senior division.
 * Values come from this catalog; UI must not invent division strings.
 */

export const OFFICIAL_DIVISION_IDS = [
  'cadet',
  'beginner',
  'junior',
  'intermediate',
  'experienced',
] as const;

export type DivisionId = (typeof OFFICIAL_DIVISION_IDS)[number];

const DIVISION_LABELS: Record<DivisionId, string> = {
  cadet: 'Cadet',
  beginner: 'Beginner',
  junior: 'Junior',
  intermediate: 'Intermediate',
  experienced: 'Experienced',
};

/** User-facing division name. `experienced` is "Experienced". */
export function getDivisionLabel(divisionId: DivisionId): string {
  return DIVISION_LABELS[divisionId];
}

export function isDivisionId(value: unknown): value is DivisionId {
  return (
    typeof value === 'string' &&
    (OFFICIAL_DIVISION_IDS as readonly string[]).includes(value)
  );
}

/**
 * Season-specific division configuration (display order + 1:1 MaterialSet).
 * Concrete values come from configuration/fixtures later — never magic strings in UI.
 */
export interface SeasonDivisionConfig {
  seasonId: string;
  divisionId: DivisionId;
  displayOrder: number;
  materialSetId: string;
}
