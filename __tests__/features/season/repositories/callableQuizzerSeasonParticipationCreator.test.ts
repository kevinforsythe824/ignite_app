import { readFileSync } from 'fs';
import { join } from 'path';

import { httpsCallable } from 'firebase/functions';
import { getDocs } from 'firebase/firestore';

import type { CreateQuizzerSeasonParticipationRequest } from '../../../../src/features/season/application/buildCreateParticipationRequest';
import type { DivisionId } from '../../../../src/features/season/domain/division';
import type { ReadyQuizzerSeasonParticipation } from '../../../../src/features/season/domain/readyParticipationRecord';
import { SeasonSetupSubmissionError } from '../../../../src/features/season/errors/seasonSetupSubmissionError';
import { CallableQuizzerSeasonParticipationCreator } from '../../../../src/features/season/repositories/callableQuizzerSeasonParticipationCreator';
import { createFirebaseQuizzerSeasonParticipationCallableSource } from '../../../../src/features/season/repositories/firebaseQuizzerSeasonParticipationCallableSource';
import type { QuizzerSeasonParticipationCallableSource } from '../../../../src/features/season/repositories/firebaseQuizzerSeasonParticipationCallableSource';

const REQUEST: CreateQuizzerSeasonParticipationRequest = {
  seasonId: '2032',
  eligibilityAge: 10,
  regionId: 'northwest',
};

function competitive(
  seasonId: string,
  regionId: string,
  divisionId: DivisionId,
): ReadyQuizzerSeasonParticipation {
  return {
    quizzerId: 'server-user',
    seasonId,
    regionId,
    readiness: 'ready',
    participationType: 'competitive',
    divisionId,
  };
}

function creatorWith(source: QuizzerSeasonParticipationCallableSource) {
  return new CallableQuizzerSeasonParticipationCreator(source);
}

describe('CallableQuizzerSeasonParticipationCreator', () => {
  it('forwards the exact request and maps created true and created false', async () => {
    const participation = competitive('2032', 'northwest', 'junior');
    const source = {
      invoke: jest
        .fn()
        .mockResolvedValueOnce({ created: true, participation })
        .mockResolvedValueOnce({
          created: false,
          participation: competitive('2032', 'central', 'experienced'),
        }),
    };
    const creator = creatorWith(source);

    await expect(creator.create(REQUEST)).resolves.toEqual({
      created: true,
      participation,
    });
    expect(source.invoke).toHaveBeenCalledWith(REQUEST);

    const existing = await creator.create(REQUEST);
    expect(existing.created).toBe(false);
    expect(existing.participation).toEqual(competitive('2032', 'central', 'experienced'));
  });

  it('rejects a malformed response, the wrong season, and an invalid participation shape', async () => {
    const source = { invoke: jest.fn() };
    const creator = creatorWith(source);

    source.invoke.mockResolvedValueOnce({ created: true });
    await expect(creator.create(REQUEST)).rejects.toMatchObject({ code: 'unexpected' });

    source.invoke.mockResolvedValueOnce({
      created: 'yes',
      participation: competitive('2032', 'northwest', 'junior'),
    });
    await expect(creator.create(REQUEST)).rejects.toBeInstanceOf(SeasonSetupSubmissionError);

    source.invoke.mockResolvedValueOnce({
      created: true,
      participation: competitive('2032', 'northwest', 'junior'),
      note: 'extra',
    });
    await expect(creator.create(REQUEST)).rejects.toMatchObject({ code: 'unexpected' });

    source.invoke.mockResolvedValueOnce({
      created: false,
      participation: competitive('2033', 'northwest', 'junior'),
    });
    await expect(creator.create(REQUEST)).rejects.toMatchObject({ code: 'unexpected' });

    source.invoke.mockResolvedValueOnce({
      created: true,
      participation: {
        ...competitive('2032', 'northwest', 'junior'),
        eligibilityAge: 10,
      },
    });
    await expect(creator.create(REQUEST)).rejects.toMatchObject({ code: 'unexpected' });
  });

  it('translates Firebase callable errors and hides raw server text', async () => {
    const cases: Array<{ code: string; expected: string }> = [
      { code: 'functions/unauthenticated', expected: 'unauthenticated' },
      { code: 'functions/invalid-argument', expected: 'invalid-request' },
      { code: 'functions/failed-precondition', expected: 'configuration-unavailable' },
      { code: 'functions/unavailable', expected: 'unavailable' },
      { code: 'functions/deadline-exceeded', expected: 'unavailable' },
      { code: 'functions/internal', expected: 'unexpected' },
    ];

    for (const entry of cases) {
      const source = {
        invoke: jest.fn().mockRejectedValue({
          code: entry.code,
          message: 'raw secret uid and document body',
        }),
      };
      await expect(creatorWith(source).create(REQUEST)).rejects.toMatchObject({
        code: entry.expected,
      });
      await expect(creatorWith(source).create(REQUEST)).rejects.not.toHaveProperty(
        'message',
        expect.stringMatching(/secret|functions\//),
      );
    }
  });

  it('does not write Firestore from the callable adapter', () => {
    const files = [
      'src/features/season/repositories/callableQuizzerSeasonParticipationCreator.ts',
      'src/features/season/repositories/firebaseQuizzerSeasonParticipationCallableSource.ts',
      'src/features/season/repositories/quizzerSeasonParticipationCreator.ts',
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source).not.toMatch(/setDoc|updateDoc|deleteDoc|writeBatch/);
      expect(source).not.toMatch(/firebase\/firestore/);
    }
  });
});

describe('createFirebaseQuizzerSeasonParticipationCallableSource', () => {
  it('calls createQuizzerSeasonParticipation with the request and returns data', async () => {
    const invoke = jest.fn(async () => ({ data: { created: true, participation: { ok: true } } }));
    (httpsCallable as jest.Mock).mockReturnValue(invoke);
    (getDocs as jest.Mock).mockClear();

    const source = createFirebaseQuizzerSeasonParticipationCallableSource(() => ({}) as never);
    await expect(source.invoke(REQUEST)).resolves.toEqual({
      created: true,
      participation: { ok: true },
    });

    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'createQuizzerSeasonParticipation');
    expect(invoke).toHaveBeenCalledWith(REQUEST);
    expect(getDocs).not.toHaveBeenCalled();
  });
});
