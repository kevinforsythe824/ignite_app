import { fireEvent } from '@testing-library/react-native';

import { authCopy } from '../../../../src/features/auth/copy/authCopy';
import { getDivisionLabel } from '../../../../src/features/season/domain/division';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';
import { renderSeasonSetupFlow } from '../../../../test-utils/renderSeasonSetupFlow';

async function openPlacement(age: string) {
  const screen = await renderSeasonSetupFlow();
  await fireEvent.changeText(await screen.findByTestId('season-setup-age-input'), age);
  await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
  return screen;
}

describe('PlacementChoiceScreen', () => {
  it('offers only the resolver choices for ages 2–4 and continues through the reducer', async () => {
    const screen = await openPlacement('3');
    expect(await screen.findByTestId('season-setup-placement-title')).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.placement.helper)).toBeTruthy();
    expect(screen.getByText(getDivisionLabel('cadet'))).toBeTruthy();
    expect(screen.getByText(getDivisionLabel('beginner'))).toBeTruthy();
    expect(screen.queryByText(getDivisionLabel('junior'))).toBeNull();
    expect(screen.queryByText(getDivisionLabel('intermediate'))).toBeNull();
    expect(screen.queryByText(getDivisionLabel('experienced'))).toBeNull();
    expect(screen.queryByText(seasonSetupCopy.studyTrack.title)).toBeNull();
    expect(screen.getAllByRole('radio')).toHaveLength(2);

    const continueButton = screen.getByTestId('season-setup-placement-continue');
    expect(continueButton.props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(screen.getByTestId('season-setup-choice-cadet'));
    expect(screen.getByTestId('season-setup-choice-cadet').props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
      checked: true,
    });
    expect(screen.getByTestId('season-setup-choice-beginner').props.accessibilityState.selected).toBe(
      false,
    );
    expect(screen.getByTestId('probe-division').props.children).toBe('cadet');
    expect(continueButton.props.accessibilityState.disabled).toBe(false);

    await fireEvent.press(screen.getByTestId('season-setup-choice-beginner'));
    expect(screen.getByTestId('probe-division').props.children).toBe('beginner');
    expect(screen.getByTestId('season-setup-choice-cadet').props.accessibilityState.selected).toBe(
      false,
    );

    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    expect(await screen.findByTestId('season-setup-age-input')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-placement-title')).toBeNull();
    expect(screen.getByTestId('season-setup-age-input').props.value).toBe('3');
  });
});
