/**
 * @jest-environment node
 */
import { SEASON_STATUSES } from '../../src/features/season/domain/season';
import {
  ContentImportDraftError,
  assertDraftApplyEligible,
} from '../../scripts/content-import/draftGate';
import {
  ContentImportEnvironmentError,
  assertDevImportEnvironment,
} from '../../scripts/content-import/environmentGate';

describe('assertDraftApplyEligible', () => {
  it('allows a draft package when nothing is installed or the installed season is draft', () => {
    expect(() =>
      assertDraftApplyEligible({ packageStatus: 'draft', installedStatus: null }),
    ).not.toThrow();
    expect(() =>
      assertDraftApplyEligible({ packageStatus: 'draft', installedStatus: 'draft' }),
    ).not.toThrow();
  });

  it('refuses every non-draft package or installed status and does not open a writer', () => {
    const openWriter = jest.fn();
    for (const status of SEASON_STATUSES) {
      if (status === 'draft') {
        continue;
      }
      expect(() => {
        assertDraftApplyEligible({ packageStatus: status, installedStatus: null });
        openWriter();
      }).toThrow(ContentImportDraftError);
      expect(() => {
        assertDraftApplyEligible({ packageStatus: 'draft', installedStatus: status });
        openWriter();
      }).toThrow(ContentImportDraftError);
    }
    expect(() => {
      assertDraftApplyEligible({ packageStatus: 'draft', installedStatus: 'mystery' });
      openWriter();
    }).toThrow(ContentImportDraftError);
    expect(openWriter).not.toHaveBeenCalled();
  });

  it('does not open a writer when the environment gate fails', () => {
    const openWriter = jest.fn();
    expect(() => {
      assertDevImportEnvironment({});
      openWriter();
    }).toThrow(ContentImportEnvironmentError);
    expect(openWriter).not.toHaveBeenCalled();
  });
});
