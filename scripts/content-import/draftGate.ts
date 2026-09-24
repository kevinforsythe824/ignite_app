import { SEASON_STATUSES, type SeasonStatus } from '../../src/features/season/domain/season';

const DRAFT_STATUS: SeasonStatus = 'draft';

export class ContentImportDraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContentImportDraftError';
  }
}

/**
 * Draft-only apply eligibility. Does not change the package or publish a season.
 * A missing installed season is eligible. Any installed status other than draft is not.
 */
export function assertDraftApplyEligible(input: {
  packageStatus: string;
  installedStatus: string | null;
}): void {
  if (input.packageStatus !== DRAFT_STATUS) {
    throw new ContentImportDraftError(
      `Package status "${input.packageStatus}" cannot be applied. Only "${DRAFT_STATUS}" packages are eligible.`,
    );
  }

  if (input.installedStatus === null || input.installedStatus === DRAFT_STATUS) {
    return;
  }

  const known = (SEASON_STATUSES as readonly string[]).includes(input.installedStatus);
  const detail = known
    ? `Installed season status "${input.installedStatus}" is not eligible.`
    : `Installed season status "${input.installedStatus}" is not a known season status.`;
  throw new ContentImportDraftError(
    `${detail} Apply does not publish or transition seasons. Only a missing season or "${DRAFT_STATUS}" may be replaced.`,
  );
}
