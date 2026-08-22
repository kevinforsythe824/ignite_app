import {
  ACCOUNT_CREATION_ROUTE,
  startAccountCreation,
  type StartAccountCreationNavigation,
} from '../../../src/features/auth/navigation/startAccountCreation';

describe('startAccountCreation', () => {
  it('navigates to the AccountCreation stack, not the credential form', () => {
    const navigate = jest.fn();
    const replace = jest.fn();
    const navigation = { navigate, replace } as StartAccountCreationNavigation;

    startAccountCreation(navigation);

    expect(ACCOUNT_CREATION_ROUTE).toBe('AccountCreation');
    expect(navigate).toHaveBeenCalledWith('AccountCreation');
    expect(replace).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalledWith('CreateAccount');
  });

  it('replaces the current screen when switching from Sign In', () => {
    const navigate = jest.fn();
    const replace = jest.fn();
    const navigation = { navigate, replace } as StartAccountCreationNavigation;

    startAccountCreation(navigation, { replace: true });

    expect(replace).toHaveBeenCalledWith('AccountCreation');
    expect(navigate).not.toHaveBeenCalled();
  });
});
