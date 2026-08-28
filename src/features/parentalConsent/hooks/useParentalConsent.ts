import {
  useParentalConsentContext,
  type ConsentResumeDestination,
  type ParentalConsentContextValue,
} from '../state/ParentalConsentProvider';

export type { ConsentResumeDestination, ParentalConsentContextValue };

/** Feature hook for parental consent session + actions. */
export function useParentalConsent(): ParentalConsentContextValue {
  return useParentalConsentContext();
}
