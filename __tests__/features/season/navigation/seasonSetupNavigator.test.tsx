import { fireEvent } from '@testing-library/react-native';
import { getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { authCopy } from '../../../../src/features/auth/copy/authCopy';
import { getDivisionLabel } from '../../../../src/features/season/domain/division';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';
import { renderSeasonSetupFlow } from '../../../../test-utils/renderSeasonSetupFlow';

async function enterAge(age: string) {
  const screen = await renderSeasonSetupFlow();
  await fireEvent.changeText(await screen.findByTestId('season-setup-age-input'), age);
  await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
  return screen;
}

describe('SeasonSetupNavigator', () => {
  it('walks age 3 through Cadet to the region boundary', async () => {
    const screen = await enterAge('3');
    expect(await screen.findByTestId('season-setup-placement-title')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('season-setup-choice-cadet'));
    await fireEvent.press(screen.getByTestId('season-setup-placement-continue'));

    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(screen.getByTestId('probe-step').props.children).toBe('region');
    expect(screen.getByTestId('probe-division').props.children).toBe('cadet');
    expect(screen.getByTestId('probe-placement-division').props.children).toBe('cadet');
    expect(screen.queryByTestId('season-setup-review-title')).toBeNull();
  });

  it('sends age 10 to the region screen without a division choice screen', async () => {
    const screen = await enterAge('10');
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-placement-title')).toBeNull();
    expect(screen.queryByText(getDivisionLabel('junior'))).toBeNull();
    expect(screen.getByTestId('probe-division').props.children).toBe('none');
    expect(screen.getByTestId('probe-placement').props.children).toBe('competitive');
    expect(screen.getByTestId('probe-placement-division').props.children).toBe('junior');
    expect(screen.getByTestId('probe-step').props.children).toBe('region');
  });

  it('walks age 16 through first year to the region boundary', async () => {
    const screen = await enterAge('16');
    expect(await screen.findByTestId('season-setup-first-year-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-placement-title')).toBeNull();
    expect(screen.queryByTestId('season-setup-region-title')).toBeNull();

    await fireEvent.press(screen.getByTestId('season-setup-choice-yes'));
    expect(screen.getByTestId('season-setup-first-year-division').props.children).toBe(
      seasonSetupCopy.firstYear.divisionOutcome(getDivisionLabel('intermediate')),
    );
    await fireEvent.press(screen.getByTestId('season-setup-first-year-continue'));
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();

    expect(getDoc).not.toHaveBeenCalled();
    expect(httpsCallable).not.toHaveBeenCalled();
  });

  it('walks an adult age through the injected Study Track id to the region boundary', async () => {
    const screen = await enterAge('25');
    expect(await screen.findByTestId('season-setup-study-track-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-first-year-title')).toBeNull();
    await fireEvent.press(screen.getByTestId('season-setup-choice-fixture-study-junior'));
    expect(screen.getByTestId('probe-material').props.children).toBe('fixture-study-junior');
    await fireEvent.press(screen.getByTestId('season-setup-study-track-continue'));
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(screen.getByTestId('probe-placement-material').props.children).toBe(
      'fixture-study-junior',
    );
  });

  it('clears Cadet when age 3 is edited to 10 and then reaches the region boundary', async () => {
    const screen = await enterAge('3');
    await fireEvent.press(await screen.findByTestId('season-setup-choice-cadet'));
    expect(screen.getByTestId('probe-division').props.children).toBe('cadet');

    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    const input = await screen.findByTestId('season-setup-age-input');
    await fireEvent.changeText(input, '10');

    expect(screen.getByTestId('probe-division').props.children).toBe('none');
    expect(screen.getByTestId('probe-placement-division').props.children).toBe('junior');
    expect(screen.queryByTestId('season-setup-region-title')).toBeNull();

    await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-placement-title')).toBeNull();
    expect(screen.queryByText(getDivisionLabel('junior'))).toBeNull();
  });

  it('clears a Study Track selection when the age changes onto the first-year path', async () => {
    const screen = await enterAge('25');
    await fireEvent.press(await screen.findByTestId('season-setup-choice-fixture-study-junior'));
    expect(screen.getByTestId('probe-material').props.children).toBe('fixture-study-junior');

    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    await fireEvent.changeText(await screen.findByTestId('season-setup-age-input'), '16');

    expect(screen.getByTestId('probe-material').props.children).toBe('none');
    expect(screen.getByTestId('probe-first-year').props.children).toBe('none');
    expect(screen.getByTestId('probe-step').props.children).toBe('firstYear');

    await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
    expect(await screen.findByTestId('season-setup-first-year-question')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-study-track-title')).toBeNull();
    expect(screen.queryByTestId('season-setup-region-title')).toBeNull();
  });
});
