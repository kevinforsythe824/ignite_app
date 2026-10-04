import { useNavigation } from '@react-navigation/native';
import { renderHook } from '@testing-library/react-native';

import { useSeasonSetupBackToAge } from '../../../../src/features/season/hooks/useSeasonSetupBackToAge';

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

const useNavigationMock = jest.mocked(useNavigation);

function mockNavigation(canGoBack: boolean) {
  const goBack = jest.fn();
  const navigate = jest.fn();
  useNavigationMock.mockReturnValue({
    canGoBack: () => canGoBack,
    goBack,
    navigate,
  } as ReturnType<typeof useNavigation>);
  return { goBack, navigate };
}

describe('useSeasonSetupBackToAge', () => {
  it('pops the stack instead of navigating forward to Eligibility Age', async () => {
    const { goBack, navigate } = mockNavigation(true);

    const { result } = await renderHook(() => useSeasonSetupBackToAge());
    result.current();

    expect(goBack).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the stack cannot go back', async () => {
    const { goBack, navigate } = mockNavigation(false);

    const { result } = await renderHook(() => useSeasonSetupBackToAge());
    result.current();

    expect(goBack).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
