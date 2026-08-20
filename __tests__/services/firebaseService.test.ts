import { ServiceNotConnectedError } from '../../src/services/errors';
import {
  createFirebaseService,
  firebaseService,
} from '../../src/services/firebase';

describe('firebaseService', () => {
  it('exposes initialize only — auth lives in features/auth', () => {
    expect(Object.keys(firebaseService).sort()).toEqual(['initialize']);
    expect(firebaseService).not.toHaveProperty('auth');
    expect(firebaseService).not.toHaveProperty('db');
    expect(createFirebaseService()).toBe(firebaseService);
  });

  it('keeps initialize as a disconnected stub', () => {
    expect(() => firebaseService.initialize()).toThrow(ServiceNotConnectedError);
    expect(() => firebaseService.initialize()).toThrow(
      'firebase.initialize is not connected yet',
    );
  });
});
