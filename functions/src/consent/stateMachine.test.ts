import { transitionConsent } from './stateMachine';
import { ParentalConsentError } from '../domain/parentalConsent';

describe('consent state machine', () => {
  it('transitions pending → initial_consent_received', () => {
    const result = transitionConsent('pending', 'processInitialConsent');
    expect(result.status).toBe('initial_consent_received');
    expect(result.changed).toBe(true);
    expect(result.initialConsentAt).toBeInstanceOf(Date);
  });

  it('is idempotent for repeated initial consent', () => {
    const result = transitionConsent(
      'initial_consent_received',
      'processInitialConsent',
    );
    expect(result.status).toBe('initial_consent_received');
    expect(result.changed).toBe(false);
  });

  it('transitions initial → approved on confirmation', () => {
    const result = transitionConsent(
      'initial_consent_received',
      'processConfirmation',
    );
    expect(result.status).toBe('approved');
    expect(result.changed).toBe(true);
  });

  it('is idempotent for repeated confirmation', () => {
    const result = transitionConsent('approved', 'processConfirmation');
    expect(result.status).toBe('approved');
    expect(result.changed).toBe(false);
  });

  it('revokes from pending, initial, and approved', () => {
    expect(transitionConsent('pending', 'revoke').status).toBe('revoked');
    expect(
      transitionConsent('initial_consent_received', 'revoke').status,
    ).toBe('revoked');
    expect(transitionConsent('approved', 'revoke').status).toBe('revoked');
  });

  it('is idempotent for revoke', () => {
    expect(transitionConsent('revoked', 'revoke').changed).toBe(false);
  });

  it('rejects invalid transitions', () => {
    expect(() => transitionConsent('expired', 'processInitialConsent')).toThrow(
      ParentalConsentError,
    );
    expect(() => transitionConsent('pending', 'processConfirmation')).toThrow(
      ParentalConsentError,
    );
  });

  it('expires from pending', () => {
    expect(transitionConsent('pending', 'expire').status).toBe('expired');
  });
});
