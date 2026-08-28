jest.mock('firebase-admin/app', () => ({
  getApp: jest.fn(),
  initializeApp: jest.fn(),
}));

import { getApp, initializeApp } from 'firebase-admin/app';

import { ensureFirebaseAdminInitialized } from './adminInit';

describe('ensureFirebaseAdminInitialized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes the default app when getApp throws app/no-app', () => {
    jest.mocked(getApp).mockImplementation(() => {
      throw new Error('The default Firebase app does not exist.');
    });

    ensureFirebaseAdminInitialized();

    expect(initializeApp).toHaveBeenCalledTimes(1);
  });

  it('does not re-initialize when the default app already exists', () => {
    jest.mocked(getApp).mockReturnValue({ name: '[DEFAULT]' } as never);

    ensureFirebaseAdminInitialized();

    expect(initializeApp).not.toHaveBeenCalled();
  });
});
