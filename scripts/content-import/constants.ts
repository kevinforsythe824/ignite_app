/**
 * Importer contract version.
 * This identifies the planning tool, not a season, division, or Firebase project.
 */
export const CONTENT_IMPORTER_VERSION = '0.1.0';

/**
 * Stand-in for values that exist only when a later slice performs an import.
 * The offline plan stays deterministic: no clock, no environment lookup.
 */
export const IMPORT_PLAN_RUNTIME_PLACEHOLDER = 'planned-at-import';

/** Named firebase-admin app for content import. Never the default app. */
export const CONTENT_IMPORT_ADMIN_APP_NAME = 'ignite-content-import';

/** Live DEV writes stay closed until Slice 4B. */
export const DEV_APPLY_DISABLED_MESSAGE = 'DEV apply is not enabled until Slice 4B';

export const IMPORT_STATUS_IMPORTING = 'importing';
export const IMPORT_STATUS_COMPLETE = 'complete';
