import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

import {
  SeasonSetupProvider,
  useSeasonSetup,
} from '../../../../src/features/season/state/SeasonSetupProvider';
import { SeasonSetupProbe } from '../../../../test-utils/renderSeasonSetupFlow';

function AgeControls(): React.JSX.Element {
  const { setEligibilityAge } = useSeasonSetup();
  return (
    <>
      <Pressable
        testID="set-age-4"
        onPress={() => {
          setEligibilityAge(4);
        }}
      >
        <Text>Set 4</Text>
      </Pressable>
      <Pressable
        testID="set-age-nan"
        onPress={() => {
          setEligibilityAge(Number.NaN);
          setEligibilityAge(2.5);
          setEligibilityAge(Number.POSITIVE_INFINITY);
        }}
      >
        <Text>Set invalid</Text>
      </Pressable>
    </>
  );
}

async function renderProvider(resolvedSeasonId: string | null, sessionIdentityKey: string | null) {
  return render(
    <SeasonSetupProvider
      resolvedSeasonId={resolvedSeasonId}
      calendarDate="2032-06-01"
      sessionIdentityKey={sessionIdentityKey}
      studyTrackOptions={null}
    >
      <AgeControls />
      <SeasonSetupProbe />
    </SeasonSetupProvider>,
  );
}

describe('SeasonSetupProvider', () => {
  it('resets answers when the resolved season id changes', async () => {
    const screen = await renderProvider('2032', 'user-a');
    await fireEvent.press(screen.getByTestId('set-age-4'));
    expect(screen.getByTestId('probe-age').props.children).toBe('4');

    await screen.rerender(
      <SeasonSetupProvider
        resolvedSeasonId="2033"
        calendarDate="2032-06-01"
        sessionIdentityKey="user-a"
        studyTrackOptions={null}
      >
        <AgeControls />
        <SeasonSetupProbe />
      </SeasonSetupProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('probe-age').props.children).toBe('none');
      expect(screen.getByTestId('probe-season').props.children).toBe('2033');
    });
  });

  it('resets answers when the injected session identity changes', async () => {
    const screen = await renderProvider('2032', 'user-a');
    await fireEvent.press(screen.getByTestId('set-age-4'));
    expect(screen.getByTestId('probe-division').props.children).toBe('none');

    await screen.rerender(
      <SeasonSetupProvider
        resolvedSeasonId="2032"
        calendarDate="2032-06-01"
        sessionIdentityKey="user-b"
        studyTrackOptions={null}
      >
        <AgeControls />
        <SeasonSetupProbe />
      </SeasonSetupProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('probe-age').props.children).toBe('none');
      expect(screen.getByTestId('probe-season').props.children).toBe('2032');
    });
  });

  it('does not dispatch a non-finite or non-integer age', async () => {
    const screen = await renderProvider('2032', 'user-a');
    await fireEvent.press(screen.getByTestId('set-age-nan'));
    expect(screen.getByTestId('probe-age').props.children).toBe('none');

    await fireEvent.press(screen.getByTestId('set-age-4'));
    await fireEvent.press(screen.getByTestId('set-age-nan'));
    expect(screen.getByTestId('probe-age').props.children).toBe('4');
  });
});
