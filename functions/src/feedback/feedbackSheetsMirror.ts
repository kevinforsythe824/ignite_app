import type { IgniteEnvironmentName } from '../config/environment';
import type { FeedbackSheetsConfig } from '../config/feedbackSheetsConfig';
import type {
  FeedbackSheetsMirrorPort,
  FeedbackSubmissionWrite,
} from './submitFeedback';

/**
 * Deterministic A→I column order. Append is positional; headers must match.
 * createdAt | category | title | message | appVersion | platform | osVersion | deviceType | environment
 */
export const FEEDBACK_SHEET_COLUMN_ORDER = [
  'createdAt',
  'category',
  'title',
  'message',
  'appVersion',
  'platform',
  'osVersion',
  'deviceType',
  'environment',
] as const;

export type FeedbackSheetColumn = (typeof FEEDBACK_SHEET_COLUMN_ORDER)[number];

export type SheetsMirrorErrorCategory =
  | 'missing_config'
  | 'auth_failure'
  | 'permission_denied'
  | 'not_found'
  | 'invalid_request'
  | 'unavailable'
  | 'network_failure'
  | 'unexpected';

export interface FeedbackSheetsAppendParams {
  spreadsheetId: string;
  worksheetName: string;
  values: string[];
}

export interface FeedbackSheetsAppendPort {
  appendRow(params: FeedbackSheetsAppendParams): Promise<void>;
}

export interface SafeSheetsMirrorLog {
  operation: 'feedbackSheetsMirror.append';
  environment: IgniteEnvironmentName;
  errorCategory: SheetsMirrorErrorCategory;
  configPresent: boolean;
}

export interface FeedbackSheetsMirrorDeps {
  environment: IgniteEnvironmentName;
  readConfig: () => FeedbackSheetsConfig | null;
  appendRow: FeedbackSheetsAppendPort['appendRow'];
  log?: (entry: SafeSheetsMirrorLog) => void;
}

/** Explicit allow-list mapping. Does not spread the Firestore document. */
export function mapFeedbackSheetRow(document: FeedbackSubmissionWrite): string[] {
  return [
    document.createdAt.toDate().toISOString(),
    document.category,
    document.title ?? '',
    document.message,
    document.appVersion,
    document.platform,
    document.osVersion,
    document.deviceType,
    document.environment,
  ];
}

function logSafe(
  log: FeedbackSheetsMirrorDeps['log'],
  entry: SafeSheetsMirrorLog,
): void {
  const write =
    log ??
    ((safe: SafeSheetsMirrorLog) => {
      console.warn(
        `[IgniteFeedback] ${safe.operation} environment=${safe.environment} errorCategory=${safe.errorCategory} configPresent=${safe.configPresent}`,
      );
    });
  write(entry);
}

function extractStatus(error: unknown): number | string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const record = error as {
    code?: unknown;
    status?: unknown;
    response?: { status?: unknown };
  };
  if (typeof record.code === 'number' || typeof record.code === 'string') {
    return record.code;
  }
  if (typeof record.status === 'number' || typeof record.status === 'string') {
    return record.status;
  }
  if (
    typeof record.response?.status === 'number' ||
    typeof record.response?.status === 'string'
  ) {
    return record.response.status;
  }
  return undefined;
}

function isNetworkFailure(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const record = error as { code?: unknown; name?: unknown };
  const code = typeof record.code === 'string' ? record.code : '';
  return (
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    record.name === 'FetchError'
  );
}

export function categorizeSheetsError(error: unknown): SheetsMirrorErrorCategory {
  if (isNetworkFailure(error)) {
    return 'network_failure';
  }
  const status = extractStatus(error);
  const normalized =
    typeof status === 'string' ? status.toUpperCase() : status;
  if (normalized === 401 || normalized === 'UNAUTHENTICATED') {
    return 'auth_failure';
  }
  if (normalized === 403 || normalized === 'PERMISSION_DENIED') {
    return 'permission_denied';
  }
  if (normalized === 404 || normalized === 'NOT_FOUND') {
    return 'not_found';
  }
  if (normalized === 400 || normalized === 'INVALID_ARGUMENT') {
    return 'invalid_request';
  }
  if (
    normalized === 429 ||
    normalized === 500 ||
    normalized === 503 ||
    normalized === 'UNAVAILABLE' ||
    normalized === 'RESOURCE_EXHAUSTED'
  ) {
    return 'unavailable';
  }
  return 'unexpected';
}

export function createFeedbackSheetsMirror(
  deps: FeedbackSheetsMirrorDeps,
): FeedbackSheetsMirrorPort {
  return {
    async append(document) {
      const config = deps.readConfig();
      if (!config) {
        logSafe(deps.log, {
          operation: 'feedbackSheetsMirror.append',
          environment: deps.environment,
          errorCategory: 'missing_config',
          configPresent: false,
        });
        return;
      }

      try {
        await deps.appendRow({
          spreadsheetId: config.spreadsheetId,
          worksheetName: config.worksheetName,
          values: mapFeedbackSheetRow(document),
        });
      } catch (error) {
        logSafe(deps.log, {
          operation: 'feedbackSheetsMirror.append',
          environment: deps.environment,
          errorCategory: categorizeSheetsError(error),
          configPresent: true,
        });
      }
    },
  };
}
