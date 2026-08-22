import { normalizeProvisionInput } from '../../../src/features/profile/domain/normalizeProvisionInput';
import { QuizzerProfileError } from '../../../src/features/profile/errors/quizzerProfileError';

describe('normalizeProvisionInput', () => {
  it('trims names and defaults avatarId to null', () => {
    expect(
      normalizeProvisionInput({
        quizzerId: '  uid-1  ',
        firstName: '  Test  ',
        lastName: '  Quizzer  ',
      }),
    ).toEqual({
      quizzerId: 'uid-1',
      firstName: 'Test',
      lastName: 'Quizzer',
      avatarId: null,
    });
  });

  it('preserves Unicode and punctuation without altering case', () => {
    expect(
      normalizeProvisionInput({
        quizzerId: 'uid-2',
        firstName: 'José',
        lastName: "O'Neill-Smith",
        avatarId: 'preset-flame',
      }),
    ).toEqual({
      quizzerId: 'uid-2',
      firstName: 'José',
      lastName: "O'Neill-Smith",
      avatarId: 'preset-flame',
    });
  });

  it('rejects empty or whitespace-only first name', () => {
    expect(() =>
      normalizeProvisionInput({
        quizzerId: 'uid-1',
        firstName: '   ',
        lastName: 'Quizzer',
      }),
    ).toThrow(
      expect.objectContaining({
        name: 'QuizzerProfileError',
        code: 'invalid-profile-data',
      }),
    );
  });

  it('rejects empty or whitespace-only last name', () => {
    expect(() =>
      normalizeProvisionInput({
        quizzerId: 'uid-1',
        firstName: 'Test',
        lastName: '',
      }),
    ).toThrow(QuizzerProfileError);
  });

  it('rejects empty quizzerId', () => {
    expect(() =>
      normalizeProvisionInput({
        quizzerId: '  ',
        firstName: 'Test',
        lastName: 'Quizzer',
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'invalid-profile-data',
      }),
    );
  });

  it('accepts explicit null avatarId', () => {
    expect(
      normalizeProvisionInput({
        quizzerId: 'uid-1',
        firstName: 'Test',
        lastName: 'Quizzer',
        avatarId: null,
      }).avatarId,
    ).toBeNull();
  });
});
