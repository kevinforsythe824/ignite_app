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

/**
 * Operations per committed chunk. The service limit is 500.
 * Stay under that limit so one chunk cannot fill a commit by itself.
 */
export const CONTENT_IMPORT_WRITE_CHUNK_SIZE = 400;

export const IMPORT_STATUS_IMPORTING = 'importing';
export const IMPORT_STATUS_COMPLETE = 'complete';
