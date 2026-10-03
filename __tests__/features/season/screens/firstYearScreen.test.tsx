import { fireEvent } from '@testing-library/react-native';
import { getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { authCopy } from '../../../../src/features/auth/copy/authCopy';
import { getDivisionLabel } from '../../../../src/features/season/domain/division';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';
import { renderSeasonSetupFlow } from '../../../../test-utils/renderSeasonSetupFlow';

describe('FirstYearScreen', () => {
  it('stores only yes or no and derives the division from placement', async () => {
    const screen = await renderSeasonSetupFlow();
    await fireEvent.changeText(await screen.findByTestId('season-setup-age-input'), '16');
    await fireEvent.press(screen.getByTestId('season-setup-age-continue'));

    expect(await screen.findByTestId('season-setup-first-year-question')).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.firstYear.question)).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.firstYear.helper)).toBeTruthy();
    expect(screen.getByTestId('season-setup-first-year-continue').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.queryByTestId('season-setup-first-year-division')).toBeNull();
    expect(screen.queryByTestId('season-setup-placement-title')).toBeNull();

    await fireEvent.press(screen.getByTestId('season-setup-choice-yes'));
    expect(screen.getByTestId('probe-first-year').props.children).toBe('true');
    expect(screen.getByTestId('probe-division').props.children).toBe('none');
    expect(screen.getByTestId('season-setup-first-year-division').props.children).toBe(
      seasonSetupCopy.firstYear.divisionOutcome(getDivisionLabel('intermediate')),
    );
    expect(screen.getByTestId('season-setup-choice-yes').props.accessibilityState.selected).toBe(
      true,
    );
    expect(screen.getByTestId('season-setup-first-year-continue').props.accessibilityState.disabled).toBe(
      false,
    );

    await fireEvent.press(screen.getByTestId('season-setup-choice-no'));
    expect(screen.getByTestId('probe-first-year').props.children).toBe('false');
    expect(screen.getByTestId('probe-division').props.children).toBe('none');
    expect(screen.getByTestId('season-setup-first-year-division').props.children).toBe(
      seasonSetupCopy.firstYear.divisionOutcome(getDivisionLabel('experienced')),
    );
    expect(screen.getByTestId('season-setup-choice-yes').props.accessibilityState.selected).toBe(
      false,
    );

    expect(getDoc).not.toHaveBeenCalled();
    expect(httpsCallable).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    expect(await screen.findByTestId('season-setup-age-input')).toBeTruthy();
    expect(screen.getByTestId('season-setup-age-input').props.value).toBe('16');
    expect(screen.onReachedRegionBoundary).not.toHaveBeenCalled();
  });
});
