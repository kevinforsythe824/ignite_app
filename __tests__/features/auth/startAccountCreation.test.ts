import type { NavigationProp } from '@react-navigation/native';

import {
  ACCOUNT_CREATION_ROUTE,
  startAccountCreation,
} from '../../../src/features/auth/navigation/startAccountCreation';
import type { AuthStackParamList } from '../../../src/features/auth/navigation/types';

describe('startAccountCreation', () => {
  it('navigates to the AccountCreation stack, not the credential form', () => {
    const navigate = jest.fn();
    const navigation = { navigate } as unknown as NavigationProp<AuthStackParamList>;

    startAccountCreation(navigation);

    expect(ACCOUNT_CREATION_ROUTE).toBe('AccountCreation');
    expect(navigate).toHaveBeenCalledWith('AccountCreation');
    expect(navigate).not.toHaveBeenCalledWith('CreateAccount');
  });
});
