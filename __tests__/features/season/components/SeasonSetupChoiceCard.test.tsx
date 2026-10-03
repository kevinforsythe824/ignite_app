import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { SeasonSetupChoiceCard } from '../../../../src/features/season/components/SeasonSetupChoiceCard';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';

describe('SeasonSetupChoiceCard', () => {
  it('exposes a radio selected state and a non-color selected label', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <SeasonSetupChoiceCard label="Cadet" selected onPress={onPress} testID="choice-cadet" />,
    );

    expect(screen.getByTestId('choice-cadet').props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
      checked: true,
    });
    expect(screen.getByRole('radio', { name: 'Cadet' })).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.choice.selected)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('choice-cadet'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not select a disabled card from color or press', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <SeasonSetupChoiceCard
        label="Beginner"
        selected={false}
        disabled
        onPress={onPress}
        testID="choice-beginner"
      />,
    );

    expect(screen.getByTestId('choice-beginner').props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
      checked: false,
    });
    expect(screen.queryByText(seasonSetupCopy.choice.selected)).toBeNull();
    await fireEvent.press(screen.getByTestId('choice-beginner'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
