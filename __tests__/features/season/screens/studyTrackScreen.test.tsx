import { fireEvent } from '@testing-library/react-native';

import { authCopy } from '../../../../src/features/auth/copy/authCopy';
import { getDivisionLabel, OFFICIAL_DIVISION_IDS } from '../../../../src/features/season/domain/division';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';
import {
  FIXTURE_STUDY_TRACK_OPTIONS,
  renderSeasonSetupFlow,
} from '../../../../test-utils/renderSeasonSetupFlow';

async function openStudyTrack(
  options?: Parameters<typeof renderSeasonSetupFlow>[0],
) {
  const screen = await renderSeasonSetupFlow(options);
  await fireEvent.changeText(await screen.findByTestId('season-setup-age-input'), '25');
  await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
  await screen.findByTestId('season-setup-study-track-title');
  return screen;
}

describe('StudyTrackScreen', () => {
  it('selects an injected opaque material set and keeps a single choice', async () => {
    const screen = await openStudyTrack();
    expect(screen.getByText(seasonSetupCopy.studyTrack.body)).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.studyTrack.helper)).toBeTruthy();

    for (const divisionId of OFFICIAL_DIVISION_IDS) {
      expect(screen.getByText(getDivisionLabel(divisionId))).toBeTruthy();
    }
    expect(screen.getAllByRole('radio')).toHaveLength(OFFICIAL_DIVISION_IDS.length);
    expect(screen.getAllByRole('radio')[0]?.props.accessibilityLabel).toBe(
      getDivisionLabel(OFFICIAL_DIVISION_IDS[0]!),
    );

    const continueButton = screen.getByTestId('season-setup-study-track-continue');
    expect(continueButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('season-setup-choice-fixture-study-junior'));
    expect(screen.getByTestId('probe-material').props.children).toBe('fixture-study-junior');
    expect(screen.getByTestId('probe-division').props.children).toBe('none');
    expect(
      screen.getByTestId('season-setup-choice-fixture-study-junior').props.accessibilityState
        .selected,
    ).toBe(true);
    expect(continueButton.props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(screen.getByTestId('season-setup-choice-fixture-study-beginner'));
    expect(screen.getByTestId('probe-material').props.children).toBe('fixture-study-beginner');
    expect(
      screen.getByTestId('season-setup-choice-fixture-study-junior').props.accessibilityState
        .selected,
    ).toBe(false);
    expect(
      screen.getByTestId('season-setup-choice-fixture-study-beginner').props.accessibilityState
        .selected,
    ).toBe(true);

    expect(screen.getByTestId('probe-material').props.children).not.toMatch(/2027|junior-2027/);
    expect(FIXTURE_STUDY_TRACK_OPTIONS.map((option) => option.materialSetId)).toContain(
      'fixture-study-beginner',
    );

    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    expect(await screen.findByTestId('season-setup-age-input')).toBeTruthy();
    expect(screen.onReachedRegionBoundary).not.toHaveBeenCalled();
  });

  it('fails closed when injected options are missing or malformed', async () => {
    const missing = await openStudyTrack({ studyTrackOptions: null });
    expect(missing.getByRole('alert').props.children).toBe(seasonSetupCopy.studyTrack.unavailable);
    expect(missing.queryByRole('radio')).toBeNull();
    expect(missing.getByTestId('season-setup-study-track-continue').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(missing.onReachedRegionBoundary).not.toHaveBeenCalled();

    const malformed = await openStudyTrack({
      studyTrackOptions: FIXTURE_STUDY_TRACK_OPTIONS.map((option) =>
        option.divisionId === 'junior' ? { ...option, materialSetId: 'bad/id' } : option,
      ),
    });
    expect(malformed.getByTestId('season-setup-study-track-unavailable')).toBeTruthy();
    expect(malformed.queryByRole('radio')).toBeNull();
    expect(
      malformed.getByTestId('season-setup-study-track-continue').props.accessibilityState.disabled,
    ).toBe(true);
    expect(malformed.getByTestId('probe-material').props.children).toBe('none');
  });
});
