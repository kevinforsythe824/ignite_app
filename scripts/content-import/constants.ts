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
