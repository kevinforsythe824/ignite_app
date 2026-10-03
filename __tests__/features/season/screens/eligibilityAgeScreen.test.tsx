import { fireEvent } from '@testing-library/react-native';

import { seasonSetupJanuaryFirstQuestion } from '../../../../src/features/season/application/seasonSetupJanuaryFirstQuestion';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';
import {
  renderSeasonSetupFlow,
  seasonSetupFlowElement,
} from '../../../../test-utils/renderSeasonSetupFlow';

function questionText(seasonId: string, calendarDate: string): string {
  const question = seasonSetupJanuaryFirstQuestion(seasonId, calendarDate);
  if (question.status !== 'question') {
    throw new Error('expected a January 1 question');
  }
  return question.text;
}

describe('EligibilityAgeScreen', () => {
  it('asks the January 1 question for the injected season and calendar date', async () => {
    const screen = await renderSeasonSetupFlow({
      resolvedSeasonId: '2032',
      calendarDate: '2031-12-31',
    });

    expect(screen.getByRole('header', { name: seasonSetupCopy.age.title })).toBeTruthy();
    expect(screen.getByTestId('season-setup-age-question').props.children).toBe(
      questionText('2032', '2031-12-31'),
    );
    expect(screen.getByText(seasonSetupCopy.age.helper)).toBeTruthy();
    expect(screen.getByTestId('season-setup-age-question').props.children).toContain('will you be');

    await screen.rerender(
      seasonSetupFlowElement({ resolvedSeasonId: '2032', calendarDate: '2032-10-01' }),
    );

    expect(screen.getByTestId('season-setup-age-question').props.children).toBe(
      questionText('2032', '2032-10-01'),
    );
    expect(screen.getByTestId('season-setup-age-question').props.children).toContain('were you');
  });

  it('blocks empty, age 1, decimals, and nonnumeric text, and allows 2, 10, 16, and 19', async () => {
    const screen = await renderSeasonSetupFlow();
    const input = () => screen.getByTestId('season-setup-age-input');
    const continueButton = () => screen.getByTestId('season-setup-age-continue');

    expect(continueButton().props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(input().props.keyboardType).toBe('number-pad');
    expect(input().props.inputMode).toBe('numeric');
    expect(screen.getByLabelText(seasonSetupCopy.age.fieldLabel)).toBeTruthy();
    expect(screen.queryByLabelText(/date of birth/i)).toBeNull();
    expect(screen.queryByLabelText(/birthday/i)).toBeNull();
    expect(screen.queryByText(/date of birth/i)).toBeNull();

    await fireEvent(input(), 'blur');
    const emptyAlert = screen.getByRole('alert');
    expect(emptyAlert.props.children).toBe(seasonSetupCopy.age.wholeNumber);
    expect(emptyAlert.props.accessibilityRole).toBe('alert');
    expect(continueButton().props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(input(), '1');
    expect(screen.getByTestId('probe-age').props.children).toBe('1');
    expect(screen.getByRole('alert').props.children).toBe(seasonSetupCopy.age.cannotContinue);
    expect(screen.queryByText('ineligibleAge')).toBeNull();
    expect(screen.queryByText('nonIntegerAge')).toBeNull();
    expect(continueButton().props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByTestId('season-setup-region-title')).toBeNull();
    expect(screen.queryByTestId('season-setup-placement-title')).toBeNull();
    expect(screen.queryByTestId('season-setup-first-year-title')).toBeNull();
    expect(screen.queryByTestId('season-setup-study-track-title')).toBeNull();

    for (const age of ['2', '10', '16', '19']) {
      await fireEvent.changeText(input(), age);
      expect(screen.getByTestId('probe-age').props.children).toBe(age);
      expect(continueButton().props.accessibilityState.disabled).toBe(false);
      expect(screen.queryByRole('alert')).toBeNull();
    }
  });

  it('does not parse 2.5 as 2 or accept nonnumeric text', async () => {
    const decimal = await renderSeasonSetupFlow();
    await fireEvent.changeText(decimal.getByTestId('season-setup-age-input'), '2.5');
    expect(decimal.getByTestId('probe-age').props.children).toBe('none');
    expect(decimal.getByTestId('season-setup-age-continue').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(decimal.getByRole('alert').props.children).toBe(seasonSetupCopy.age.wholeNumber);
    expect(decimal.queryByTestId('season-setup-region-title')).toBeNull();

    const words = await renderSeasonSetupFlow();
    await fireEvent.changeText(words.getByTestId('season-setup-age-input'), 'ten');
    expect(words.getByTestId('probe-age').props.children).toBe('none');
    expect(words.getByTestId('season-setup-age-continue').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(words.getByRole('alert')).toBeTruthy();
    expect(words.queryByTestId('season-setup-region-title')).toBeNull();
  });

  it('fails closed when the January 1 question cannot be formed', async () => {
    const screen = await renderSeasonSetupFlow({ resolvedSeasonId: null });
    expect(screen.getByRole('alert').props.children).toBe(seasonSetupCopy.age.unavailable);
    expect(screen.queryByTestId('season-setup-age-question')).toBeNull();
    expect(screen.queryByTestId('season-setup-age-input')).toBeNull();
    expect(screen.getByTestId('season-setup-age-continue').props.accessibilityState.disabled).toBe(
      true,
    );
  });
});
