import { ServiceNotConnectedError } from '../../src/services/errors';
import {
  createFirebaseService,
  firebaseService,
} from '../../src/services/firebase';

describe('firebaseService', () => {
  it('exposes auth and initialize only — no deck or progress database surface', () => {
    expect(Object.keys(firebaseService).sort()).toEqual(['auth', 'initialize']);
    expect(firebaseService).not.toHaveProperty('db');
    expect(createFirebaseService()).toBe(firebaseService);
  });

  it('keeps auth as a disconnected stub', () => {
    expect(() => firebaseService.auth.getCurrentUser()).toThrow(ServiceNotConnectedError);
    expect(() => firebaseService.initialize()).toThrow(
      'firebase.initialize is not connected yet',
    );
  });
});
