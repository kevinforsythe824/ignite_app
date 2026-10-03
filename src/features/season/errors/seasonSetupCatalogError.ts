export type SeasonSetupCatalogErrorCode =
  | 'permission-denied'
  | 'unavailable'
  | 'invalid-catalog'
  | 'unexpected';

const MESSAGES: Record<SeasonSetupCatalogErrorCode, string> = {
  'permission-denied': "Season setup isn't available right now.",
  unavailable: 'Season setup is temporarily unavailable. Check your connection and try again.',
  'invalid-catalog': "Season setup isn't available right now.",
  unexpected: "Season setup isn't available right now.",
};

/**
 * Application-facing Season Setup catalog failure.
 * The message is safe to show. It does not include document contents or Firebase codes.
 */
export class SeasonSetupCatalogError extends Error {
  readonly code: SeasonSetupCatalogErrorCode;

  constructor(code: SeasonSetupCatalogErrorCode) {
    super(MESSAGES[code]);
    this.name = 'SeasonSetupCatalogError';
    this.code = code;
  }

  get retryable(): boolean {
    return this.code === 'unavailable' || this.code === 'unexpected';
  }
}
