import { act, render, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
import { Text } from 'react-native';

import { AuthProvider } from '../../../../src/features/auth';
import { ParticipationRepositoryError } from '../../../../src/features/season/errors/participationRepositoryError';
import { SeasonLifecycleError } from '../../../../src/features/season/errors/seasonLifecycleError';
import { deriveSeasonLifecycleSeam } from '../../../../src/features/season/application/deriveSeasonLifecycleSeam';
import {
  useSeasonParticipation,
  SeasonParticipationProvider,
  type SeasonParticipationContextValue,
} from '../../../../src/features/season/state/SeasonParticipationProvider';
import type { SeasonParticipationSession } from '../../../../src/features/season/state/seasonParticipationSession';
import { createAuthRepositoryFake } from '../../../../test-utils/authRepositoryFake';
import {
  createSeasonParticipationTestDoubles,
  SEASON_PARTICIPATION_TEST_CALENDAR_DATE,
  SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID,
  SEASON_PARTICIPATION_TEST_SEASON_ID,
  testCompetitiveParticipation,
  testMaterialSet,
  testSeason,
  testStudyTrackParticipation,
  type SeasonParticipationTestDoubles,
} from '../../../../test-utils/seasonParticipationTestDoubles';

function Probe({
  holder,
}: {
  holder: { current: SeasonParticipationContextValue | null };
}): React.JSX.Element {
  const value = useSeasonParticipation();
  holder.current = value;
  return <Text testID="season-status">{value.session.status}</Text>;
}

async function renderSession(
  doubles: SeasonParticipationTestDoubles,
  auth = createAuthRepositoryFake({
    initialIdentity: { uid: 'user-1', email: 'quizzer@example.com', emailVerified: false },
  }),
) {
  const holder: { current: SeasonParticipationContextValue | null } = { current: null };
  const screen = await render(
    <AuthProvider repository={auth}>
      <SeasonParticipationProvider
        clock={doubles.clock}
        materialSetCatalog={doubles.materialSetCatalog}
        participationRepository={doubles.participationRepository}
        readEnvironment={doubles.readEnvironment}
        seasonCatalog={doubles.seasonCatalog}
      >
        <Probe holder={holder} />
      </SeasonParticipationProvider>
    </AuthProvider>,
  );
  return { screen, auth, holder };
}

async function waitForStatus(
  screen: Awaited<ReturnType<typeof renderSession>>['screen'],
  status: SeasonParticipationSession['status'],
) {
  await waitFor(() => {
    expect(screen.getByTestId('season-status').props.children).toBe(status);
  });
}

describe('SeasonParticipationProvider', () => {
  it('does not read the wall clock from the resolver, mapper, or lifecycle rules', () => {
    const files = [
      'src/features/season/application/loadSeasonParticipationSession.ts',
      'src/features/season/data/mapSeasonCatalogDocuments.ts',
      'src/features/season/domain/resolveCurrentSeason.ts',
      'src/features/season/application/deriveSeasonLifecycleSeam.ts',
      'src/app/lifecycle/resolveAccountLifecycleDestination.ts',
    ];
    for (const file of files) {
      const source = readFileSync(join(__dirname, '../../../../', file), 'utf8');
      expect(source).not.toContain('Date.now');
      expect(source).not.toContain('new Date(');
    }
    const clock = readFileSync(
      join(__dirname, '../../../../src/features/season/application/seasonClock.ts'),
      'utf8',
    );
    expect(clock).toContain('new Date()');
  });

  it('selects a date-valid DEV draft and records the Chicago calendar date', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.readEnvironment.mockReturnValue('dev');
    doubles.seasonCatalog.listSeasons.mockResolvedValue([
      testSeason({ status: 'draft' }),
    ]);
    doubles.participationRepository.getParticipation.mockResolvedValue(null);
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'setupRequired');
    expect(holder.current?.session).toMatchObject({
      status: 'setupRequired',
      quizzerId: 'user-1',
      calendarDate: SEASON_PARTICIPATION_TEST_CALENDAR_DATE,
      season: expect.objectContaining({ seasonId: SEASON_PARTICIPATION_TEST_SEASON_ID, status: 'draft' }),
    });
    expect(doubles.clock).toHaveBeenCalled();
  });

  it.each(['staging', 'prod'])(
    'does not select a date-valid draft in %s',
    async (environment) => {
      const doubles = createSeasonParticipationTestDoubles();
      doubles.readEnvironment.mockReturnValue(environment);
      doubles.seasonCatalog.listSeasons.mockResolvedValue([testSeason({ status: 'draft' })]);
      const { screen } = await renderSession(doubles);

      await waitForStatus(screen, 'noCurrentSeason');
    },
  );

  it('treats a future availability date as no current Season', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.seasonCatalog.listSeasons.mockResolvedValue([
      testSeason({
        startDate: '2032-07-01',
        endDate: '2032-08-31',
        igniteAvailabilityDate: '2032-07-01',
      }),
    ]);
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'noCurrentSeason');
    expect(holder.current?.session).toMatchObject({
      calendarDate: SEASON_PARTICIPATION_TEST_CALENDAR_DATE,
    });
  });

  it('treats an ended Season as no current Season', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.seasonCatalog.listSeasons.mockResolvedValue([
      testSeason({ endDate: '2032-06-01', igniteAvailabilityDate: '2031-09-01' }),
    ]);
    const { screen } = await renderSession(doubles);
    await waitForStatus(screen, 'noCurrentSeason');
  });

  it('treats an archived Season as no current Season', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.seasonCatalog.listSeasons.mockResolvedValue([testSeason({ status: 'archived' })]);
    const { screen } = await renderSession(doubles);
    await waitForStatus(screen, 'noCurrentSeason');
  });

  it('fails closed when more than one Season is current', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.seasonCatalog.listSeasons.mockResolvedValue([
      testSeason(),
      testSeason({ seasonId: '2033', name: 'Other current' }),
    ]);
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'error');
    expect(holder.current?.session).toMatchObject({
      status: 'error',
      error: expect.objectContaining({ code: 'ambiguous-season' }),
    });
  });

  it('fails closed when the Season catalog is malformed', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.seasonCatalog.listSeasons.mockRejectedValue(
      new SeasonLifecycleError('invalid-season-catalog'),
    );
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'error');
    expect(holder.current?.session).toMatchObject({
      status: 'error',
      error: expect.objectContaining({ code: 'invalid-season-catalog' }),
    });
  });

  it('requires setup when current participation is missing and does not write', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    const write = jest.fn();
    doubles.participationRepository.getParticipation.mockResolvedValue(null);
    const { screen } = await renderSession(doubles);

    await waitForStatus(screen, 'setupRequired');
    expect(doubles.participationRepository.getParticipation).toHaveBeenCalledWith(
      'user-1',
      SEASON_PARTICIPATION_TEST_SEASON_ID,
    );
    expect(write).not.toHaveBeenCalled();
    const loader = readFileSync(
      join(
        __dirname,
        '../../../../src/features/season/application/loadSeasonParticipationSession.ts',
      ),
      'utf8',
    );
    expect(loader).not.toContain('createQuizzerSeasonParticipation');
    expect(loader).not.toContain('setDoc');
  });

  it('continues a valid current participation into MaterialSet resolution', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'ready');
    expect(holder.current?.session).toMatchObject({
      status: 'ready',
      studyTarget: {
        seasonId: SEASON_PARTICIPATION_TEST_SEASON_ID,
        materialSetId: SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID,
      },
    });
  });

  it('does not treat an older Season participation as the current Season', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.participationRepository.getParticipation.mockImplementation(
      async (userId: string, seasonId: string) => {
        if (seasonId === '2031') {
          return testCompetitiveParticipation(userId, '2031');
        }
        return null;
      },
    );
    const { screen } = await renderSession(doubles);

    await waitForStatus(screen, 'setupRequired');
    const seasonIds = doubles.participationRepository.getParticipation.mock.calls.map(
      (call) => call[1],
    );
    expect(seasonIds).toEqual([SEASON_PARTICIPATION_TEST_SEASON_ID]);
    expect(seasonIds).not.toContain('2031');
  });

  it('maps malformed participation to an error', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.participationRepository.getParticipation.mockRejectedValue(
      new ParticipationRepositoryError('invalid-participation-data', 'raw document dumped'),
    );
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'error');
    expect(holder.current?.session).toMatchObject({
      status: 'error',
      error: expect.objectContaining({ code: 'invalid-participation' }),
    });
    if (holder.current?.session.status === 'error') {
      expect(holder.current.session.error.message).not.toContain('raw document dumped');
    }
  });

  it('maps a participation network failure to an error', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.participationRepository.getParticipation.mockRejectedValue(
      new ParticipationRepositoryError('unavailable', 'firestore unavailable'),
    );
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'error');
    expect(holder.current?.session).toMatchObject({
      status: 'error',
      error: expect.objectContaining({ code: 'unavailable' }),
    });
  });

  it('resolves competitive Junior to the persisted MaterialSet id', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.materialSetCatalog.listMaterialSets.mockResolvedValue([
      testMaterialSet('2032', 'material-beginner', 'beginner', 'Beginner'),
      testMaterialSet('2032', SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID, 'junior', 'Junior'),
    ]);
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'ready');
    expect(holder.current?.session).toMatchObject({
      status: 'ready',
      studyTarget: {
        seasonId: '2032',
        materialSetId: SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID,
      },
    });
  });

  it('resolves Study Track to the persisted MaterialSet id', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.participationRepository.getParticipation.mockResolvedValue(
      testStudyTrackParticipation('user-1', '2032', 'material-adult'),
    );
    doubles.materialSetCatalog.listMaterialSets.mockResolvedValue([
      testMaterialSet('2032', 'material-adult', 'experienced', 'Experienced'),
      testMaterialSet('2032', 'material-junior', 'junior', 'Junior'),
    ]);
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'ready');
    expect(holder.current?.session).toMatchObject({
      status: 'ready',
      studyTarget: { seasonId: '2032', materialSetId: 'material-adult' },
    });
  });

  it('fails closed when the Study target is missing', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.materialSetCatalog.listMaterialSets.mockResolvedValue([
      testMaterialSet('2032', 'material-beginner', 'beginner', 'Beginner'),
    ]);
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'error');
    expect(holder.current?.session).toMatchObject({
      status: 'error',
      error: expect.objectContaining({ code: 'invalid-material-set' }),
    });
  });

  it('fails closed when two competitive MaterialSets match one division', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.materialSetCatalog.listMaterialSets.mockResolvedValue([
      testMaterialSet('2032', 'material-junior-a', 'junior', 'Junior A'),
      testMaterialSet('2032', 'material-junior-b', 'junior', 'Junior B'),
    ]);
    const { screen, holder } = await renderSession(doubles);

    await waitForStatus(screen, 'error');
    expect(holder.current?.session).toMatchObject({
      status: 'error',
      error: expect.objectContaining({ code: 'invalid-material-set' }),
    });
  });

  it('rejects a MaterialSet from another Season', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.materialSetCatalog.listMaterialSets.mockResolvedValue([
      testMaterialSet('2031', 'material-junior', 'junior', 'Junior'),
    ]);
    const { screen } = await renderSession(doubles);
    await waitForStatus(screen, 'error');
  });

  it('ignores a late User A response after Auth switches to User B', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    let releaseA: (value: ReturnType<typeof testCompetitiveParticipation>) => void = () =>
      undefined;
    doubles.materialSetCatalog.listMaterialSets.mockResolvedValue([
      testMaterialSet('2032', 'material-junior', 'junior', 'Junior'),
      testMaterialSet('2032', 'material-beginner', 'beginner', 'Beginner'),
    ]);
    doubles.participationRepository.getParticipation.mockImplementation(
      (userId: string, seasonId: string) => {
        if (userId === 'user-a') {
          return new Promise((resolve) => {
            releaseA = () => resolve(testCompetitiveParticipation('user-a', seasonId, 'junior'));
          });
        }
        return Promise.resolve(testCompetitiveParticipation(userId, seasonId, 'beginner'));
      },
    );
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const { screen, holder } = await renderSession(doubles, auth);

    await waitFor(() => {
      expect(doubles.participationRepository.getParticipation).toHaveBeenCalledWith(
        'user-a',
        '2032',
      );
    });

    await act(async () => {
      auth.emit({ uid: 'user-b', email: 'b@example.com', emailVerified: false });
    });

    await waitFor(() => {
      expect(holder.current?.session).toMatchObject({
        status: 'ready',
        quizzerId: 'user-b',
        studyTarget: { materialSetId: 'material-beginner' },
      });
    });

    await act(async () => {
      releaseA(testCompetitiveParticipation('user-a', '2032', 'junior'));
    });

    expect(holder.current?.session).toMatchObject({
      status: 'ready',
      quizzerId: 'user-b',
      studyTarget: { seasonId: '2032', materialSetId: 'material-beginner' },
    });
    expect(screen.getByTestId('season-status').props.children).toBe('ready');
  });

  it('returns to idle on sign-out and ignores a late signed-in response', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    let release: (value: null) => void = () => undefined;
    doubles.participationRepository.getParticipation.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve(null);
        }),
    );
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-1', email: 'quizzer@example.com', emailVerified: false },
    });
    const { screen, holder } = await renderSession(doubles, auth);

    await waitFor(() => {
      expect(doubles.participationRepository.getParticipation).toHaveBeenCalled();
    });

    await act(async () => {
      auth.emit(null);
    });
    await waitForStatus(screen, 'idle');

    await act(async () => {
      release(null);
    });
    expect(holder.current?.session.status).toBe('idle');
  });

  it('does not reload when the same uid refreshes identity metadata', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-1', email: 'quizzer@example.com', emailVerified: false },
    });
    const { screen } = await renderSession(doubles, auth);
    await waitForStatus(screen, 'ready');
    const calls = doubles.seasonCatalog.listSeasons.mock.calls.length;

    await act(async () => {
      auth.emit({ uid: 'user-1', email: 'renamed@example.com', emailVerified: true });
    });

    expect(doubles.seasonCatalog.listSeasons).toHaveBeenCalledTimes(calls);
    expect(screen.getByTestId('season-status').props.children).toBe('ready');
  });

  it('lets a newer refresh ignore an older Season response', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    let releaseFirst: (value: ReturnType<typeof testSeason>[]) => void = () => undefined;
    let calls = 0;
    doubles.seasonCatalog.listSeasons.mockImplementation(() => {
      calls += 1;
      if (calls === 1) {
        return new Promise((resolve) => {
          releaseFirst = resolve;
        });
      }
      return Promise.resolve([testSeason()]);
    });
    const { screen, holder } = await renderSession(doubles);
    await waitFor(() => {
      expect(calls).toBe(1);
    });

    void holder.current?.refresh();
    await waitFor(() => {
      expect(calls).toBe(2);
    });
    await act(async () => {
      releaseFirst([]);
    });

    await waitForStatus(screen, 'ready');
    expect(holder.current?.session).toMatchObject({
      status: 'ready',
      season: expect.objectContaining({ seasonId: SEASON_PARTICIPATION_TEST_SEASON_ID }),
    });
  });

  it('ignores a stale setup completion for a previous Quizzer', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.participationRepository.getParticipation.mockImplementation(
      async (userId: string, seasonId: string) => {
        if (userId === 'user-b') {
          return testCompetitiveParticipation('user-b', seasonId, 'beginner');
        }
        return null;
      },
    );
    doubles.materialSetCatalog.listMaterialSets.mockResolvedValue([
      testMaterialSet('2032', 'material-beginner', 'beginner', 'Beginner'),
      testMaterialSet('2032', 'material-junior', 'junior', 'Junior'),
    ]);
    const auth = createAuthRepositoryFake({
      initialIdentity: { uid: 'user-a', email: 'a@example.com', emailVerified: false },
    });
    const { screen, holder } = await renderSession(doubles, auth);
    await waitForStatus(screen, 'setupRequired');

    await act(async () => {
      auth.emit({ uid: 'user-b', email: 'b@example.com', emailVerified: false });
    });
    await waitFor(() => {
      expect(holder.current?.session).toMatchObject({
        status: 'ready',
        quizzerId: 'user-b',
        studyTarget: { materialSetId: 'material-beginner' },
      });
    });
    const calls = doubles.participationRepository.getParticipation.mock.calls.length;

    await act(async () => {
      await holder.current?.acceptParticipationReady({
        quizzerId: 'user-a',
        seasonId: '2032',
      });
    });

    expect(doubles.participationRepository.getParticipation).toHaveBeenCalledTimes(calls);
    expect(holder.current?.session).toMatchObject({
      status: 'ready',
      quizzerId: 'user-b',
      participation: expect.objectContaining({ quizzerId: 'user-b' }),
      studyTarget: { materialSetId: 'material-beginner' },
    });
  });

  it('refreshes from the authoritative read after a matching setup claim', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    let stored = false;
    doubles.participationRepository.getParticipation.mockImplementation(
      async (userId: string, seasonId: string) => {
        if (!stored) {
          return null;
        }
        return testCompetitiveParticipation(userId, seasonId);
      },
    );
    const { screen, holder } = await renderSession(doubles);
    await waitForStatus(screen, 'setupRequired');

    stored = true;
    await act(async () => {
      await holder.current?.acceptParticipationReady({
        quizzerId: 'user-1',
        seasonId: SEASON_PARTICIPATION_TEST_SEASON_ID,
      });
    });

    await waitForStatus(screen, 'ready');
    expect(holder.current?.session).toMatchObject({
      status: 'ready',
      studyTarget: { materialSetId: SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID },
    });
  });
});

describe('deriveSeasonLifecycleSeam', () => {
  it('never reports unavailable for a live session', () => {
    const sessions: SeasonParticipationSession[] = [
      { status: 'idle' },
      { status: 'loading', quizzerId: 'user-1' },
      {
        status: 'noCurrentSeason',
        quizzerId: 'user-1',
        calendarDate: SEASON_PARTICIPATION_TEST_CALENDAR_DATE,
      },
      {
        status: 'setupRequired',
        quizzerId: 'user-1',
        season: testSeason(),
        calendarDate: SEASON_PARTICIPATION_TEST_CALENDAR_DATE,
      },
      {
        status: 'ready',
        quizzerId: 'user-1',
        season: testSeason(),
        calendarDate: SEASON_PARTICIPATION_TEST_CALENDAR_DATE,
        participation: testCompetitiveParticipation('user-1'),
        studyTarget: { seasonId: '2032', materialSetId: 'material-junior' },
      },
      {
        status: 'error',
        quizzerId: 'user-1',
        error: new SeasonLifecycleError('unexpected'),
      },
    ];

    for (const session of sessions) {
      expect(deriveSeasonLifecycleSeam(session).status).not.toBe('unavailable');
    }
    expect(deriveSeasonLifecycleSeam(sessions[0]!).status).toBe('loading');
    expect(deriveSeasonLifecycleSeam(sessions[2]!).status).toBe('noCurrentSeason');
    expect(deriveSeasonLifecycleSeam(sessions[3]!).status).toBe('required');
    expect(deriveSeasonLifecycleSeam(sessions[4]!).status).toBe('ready');
    expect(deriveSeasonLifecycleSeam(sessions[5]!).status).toBe('error');
  });
});
