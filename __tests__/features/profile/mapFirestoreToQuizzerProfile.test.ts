import { InvalidQuizzerProfileDocumentError } from '../../../src/features/profile/data/mapFirestoreToQuizzerProfile';
import { mapFirestoreQuizzerProfileToDomain } from '../../../src/features/profile/data/mapFirestoreToQuizzerProfile';

describe('mapFirestoreQuizzerProfileToDomain', () => {
  it('maps a valid document without altering name values', () => {
    expect(
      mapFirestoreQuizzerProfileToDomain(
        {
          first_name: '  Padded  ',
          last_name: 'Quizzer',
          avatar_id: 'preset-a',
        },
        'uid-1',
      ),
    ).toEqual({
      quizzerId: 'uid-1',
      firstName: '  Padded  ',
      lastName: 'Quizzer',
      avatarId: 'preset-a',
    });
  });

  it('maps null avatar_id', () => {
    expect(
      mapFirestoreQuizzerProfileToDomain(
        {
          first_name: 'Test',
          last_name: 'Quizzer',
          avatar_id: null,
        },
        'uid-1',
      ).avatarId,
    ).toBeNull();
  });

  it('rejects empty first_name as corrupt data', () => {
    expect(() =>
      mapFirestoreQuizzerProfileToDomain(
        {
          first_name: '',
          last_name: 'Quizzer',
          avatar_id: null,
        },
        'uid-1',
      ),
    ).toThrow(InvalidQuizzerProfileDocumentError);
  });

  it('rejects whitespace-only last_name as corrupt data', () => {
    expect(() =>
      mapFirestoreQuizzerProfileToDomain(
        {
          first_name: 'Test',
          last_name: '   ',
          avatar_id: null,
        },
        'uid-1',
      ),
    ).toThrow(
      expect.objectContaining({
        name: 'InvalidQuizzerProfileDocumentError',
        field: 'last_name',
      }),
    );
  });

  it('rejects non-object documents', () => {
    expect(() => mapFirestoreQuizzerProfileToDomain(null, 'uid-1')).toThrow(
      InvalidQuizzerProfileDocumentError,
    );
  });

  it('rejects wrong avatar_id type', () => {
    expect(() =>
      mapFirestoreQuizzerProfileToDomain(
        {
          first_name: 'Test',
          last_name: 'Quizzer',
          avatar_id: 12,
        },
        'uid-1',
      ),
    ).toThrow(
      expect.objectContaining({
        field: 'avatar_id',
      }),
    );
  });
});
