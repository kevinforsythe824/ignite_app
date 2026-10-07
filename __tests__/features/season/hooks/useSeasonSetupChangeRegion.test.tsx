import { useNavigation } from '@react-navigation/native';
import { fireEvent, render, renderHook } from '@testing-library/react-native';
import React, { useEffect } from 'react';

import { authCopy } from '../../../../src/features/auth/copy/authCopy';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';
import { OFFICIAL_REGIONS } from '../../../../src/features/season/domain/officialRegions';
import { useSeasonSetupChangeRegion } from '../../../../src/features/season/hooks/useSeasonSetupChangeRegion';
import { ReviewScreen } from '../../../../src/features/season/screens/ReviewScreen';
import {
  SeasonSetupProvider,
  useSeasonSetup,
} from '../../../../src/features/season/state/SeasonSetupProvider';
import { SeasonSetupSubmissionProvider } from '../../../../src/features/season/state/SeasonSetupSubmissionProvider';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
  };
});

const useNavigationMock = jest.mocked(useNavigation);

function mockNavigation() {
  const popTo = jest.fn();
  const goBack = jest.fn();
  const navigate = jest.fn();
  const reset = jest.fn();
  const replace = jest.fn();
  useNavigationMock.mockReturnValue({
    canGoBack: () => true,
    popTo,
    goBack,
    navigate,
    reset,
    replace,
  } as ReturnType<typeof useNavigation>);
  return { popTo, goBack, navigate, reset, replace };
}

function ReadyReview(): React.JSX.Element {
  const { setEligibilityAge, setRegion } = useSeasonSetup();

  useEffect(() => {
    setEligibilityAge(10);
    setRegion('southwest');
  }, [setEligibilityAge, setRegion]);

  return <ReviewScreen />;
}

describe('useSeasonSetupChangeRegion', () => {
  it('pops to Region and does not go back, navigate, reset, or replace', async () => {
    const { popTo, goBack, navigate, reset, replace } = mockNavigation();

    const { result } = await renderHook(() => useSeasonSetupChangeRegion());
    result.current();

    expect(popTo).toHaveBeenCalledTimes(1);
    expect(popTo.mock.calls[0]).toEqual(['Region']);
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('wires Review Change to popTo Region and header Back to goBack', async () => {
    const { popTo, goBack, navigate, reset, replace } = mockNavigation();
    const screen = await render(
      <SeasonSetupProvider
        resolvedSeasonId="2032"
        calendarDate="2032-06-01"
        sessionIdentityKey="user-a"
        regions={OFFICIAL_REGIONS}
      >
        <SeasonSetupSubmissionProvider creator={{ create: jest.fn() }}>
          <ReadyReview />
        </SeasonSetupSubmissionProvider>
      </SeasonSetupProvider>,
    );

    await fireEvent.press(
      await screen.findByTestId('season-setup-review-change-region'),
    );

    expect(popTo).toHaveBeenCalledTimes(1);
    expect(popTo.mock.calls[0]).toEqual(['Region']);
    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText(seasonSetupCopy.review.changeRegion)).toBeTruthy();

    popTo.mockClear();
    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(popTo).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(reset).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
