import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
} from 'firebase/auth';

import { AuthenticationError } from '../../../src/features/auth';
import { createFirebaseAuthSource } from '../../../src/features/auth/repositories/firebaseAuthSource';
import type { getFirebaseAuth } from '../../../src/services/firebase/firebaseAuth';

describe('createFirebaseAuthSource credential change sequencing', () => {
  const currentUser = {
    uid: 'user-1',
    email: 'quizzer@example.com',
    emailVerified: false,
    reload: jest.fn(async () => undefined),
  };

  const getAuthInstance = jest.fn(() => ({
    currentUser,
  })) as unknown as typeof getFirebaseAuth;

  beforeEach(() => {
    jest.clearAllMocks();
    (EmailAuthProvider.credential as jest.Mock).mockImplementation(
      (email: string, password: string) => ({ email, password }),
    );
    (reauthenticateWithCredential as jest.Mock).mockResolvedValue(undefined);
    (verifyBeforeUpdateEmail as jest.Mock).mockResolvedValue(undefined);
    (updatePassword as jest.Mock).mockResolvedValue(undefined);
  });

  it('changeEmail reauthenticates then calls verifyBeforeUpdateEmail', async () => {
    const source = createFirebaseAuthSource(getAuthInstance);

    await source.changeEmail('new@example.com', 'current-secret');

    expect(EmailAuthProvider.credential).toHaveBeenCalledWith(
      'quizzer@example.com',
      'current-secret',
    );
    expect(reauthenticateWithCredential).toHaveBeenCalled();
    expect(verifyBeforeUpdateEmail).toHaveBeenCalledWith(currentUser, 'new@example.com');
  });

  it('changeEmail does not verify when reauthentication fails', async () => {
    (reauthenticateWithCredential as jest.Mock).mockRejectedValue({
      code: 'auth/wrong-password',
    });
    const source = createFirebaseAuthSource(getAuthInstance);

    await expect(source.changeEmail('new@example.com', 'bad')).rejects.toMatchObject({
      code: 'auth/wrong-password',
    });
    expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled();
  });

  it('changePassword reauthenticates then calls updatePassword', async () => {
    const source = createFirebaseAuthSource(getAuthInstance);

    await source.changePassword('current-secret', 'new-secret');

    expect(EmailAuthProvider.credential).toHaveBeenCalled();
    expect(reauthenticateWithCredential).toHaveBeenCalled();
    expect(updatePassword).toHaveBeenCalledWith(currentUser, 'new-secret');
  });

  it('changePassword does not update when reauthentication fails', async () => {
    (reauthenticateWithCredential as jest.Mock).mockRejectedValue({
      code: 'auth/requires-recent-login',
    });
    const source = createFirebaseAuthSource(getAuthInstance);

    await expect(source.changePassword('bad', 'new-secret')).rejects.toMatchObject({
      code: 'auth/requires-recent-login',
    });
    expect(updatePassword).not.toHaveBeenCalled();
  });

  it('throws AuthenticationError when there is no current user', async () => {
    const emptyAuth = jest.fn(() => ({
      currentUser: null,
    })) as unknown as typeof getFirebaseAuth;
    const source = createFirebaseAuthSource(emptyAuth);

    await expect(source.changeEmail('new@example.com', 'secret')).rejects.toBeInstanceOf(
      AuthenticationError,
    );
    expect(reauthenticateWithCredential).not.toHaveBeenCalled();
  });
});
