import { resolveParticipationOptions } from '../domain/eligibility/resolveParticipationOptions';

/**
 * Whether the eligibility-age step can advance.
 * resolveParticipationOptions is the only eligibility source of truth.
 * Continue is allowed for an eligible age, and for ages 15–18 before the
 * first-year answer exists (`firstYearRequired`).
 * ineligibleAge, nonIntegerAge, and any other invalid result stay put.
 */
export function canAdvanceFromEligibilityAge(eligibilityAge: number): boolean {
  const result = resolveParticipationOptions({ eligibilityAge });
  return (
    result.status === 'eligible' ||
    (result.status === 'invalid' && result.reason === 'firstYearRequired')
  );
}
