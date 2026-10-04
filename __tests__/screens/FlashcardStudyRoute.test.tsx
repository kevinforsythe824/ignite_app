import { readFileSync } from 'fs';
import { join } from 'path';

import { render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { AuthProvider } from '../../src/features/auth';
import {
  TEMPORARY_STUDY_MATERIAL_SET_ID,
  TEMPORARY_STUDY_SEASON_ID,
  TEST_MATERIAL_SET_ID,
  TEST_SEASON_ID,
} from '../../src/features/flashcards/domain/testSeason';
import { firestoreCurriculumRepository } from '../../src/features/flashcards/repositories';
import { jsonCurriculumRepository } from '../../src/features/flashcards/repositories/jsonCurriculumRepository';
import { FlashcardStudyRoute, studyCurriculumRepository } from '../../src/features/flashcards/screens/FlashcardStudyRoute';
import { SeasonParticipationProvider } from '../../src/features/season/state/SeasonParticipationProvider';
import { createAuthRepositoryFake } from '../../test-utils/authRepositoryFake';
import {
  createSeasonParticipationTestDoubles,
  SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID,
  SEASON_PARTICIPATION_TEST_SEASON_ID,
  testMaterialSet,
  testStudyTrackParticipation,
  type SeasonParticipationTestDoubles,
} from '../../test-utils/seasonParticipationTestDoubles';

jest.mock('../../src/features/flashcards/repositories/firebaseCurriculumSource', () => ({
  createFirebaseCurriculumSource: jest.fn(),
  firestoreCurriculumRepository: {
    getCurriculum: jest.fn(),
  },
}));

const getCurriculum = firestoreCurriculumRepository.getCurriculum as jest.Mock;

async function renderStudy(doubles: SeasonParticipationTestDoubles) {
  const auth = createAuthRepositoryFake({
    initialIdentity: { uid: 'user-1', email: 'quizzer@example.com', emailVerified: false },
  });
  return render(
    <AuthProvider repository={auth}>
      <SeasonParticipationProvider
        clock={doubles.clock}
        materialSetCatalog={doubles.materialSetCatalog}
        participationRepository={doubles.participationRepository}
        readEnvironment={doubles.readEnvironment}
        seasonCatalog={doubles.seasonCatalog}
      >
        <FlashcardStudyRoute />
      </SeasonParticipationProvider>
    </AuthProvider>,
  );
}

describe('FlashcardStudyRoute', () => {
  beforeEach(() => {
    getCurriculum.mockReset();
    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) => ({
      seasonId,
      materialSetId,
      title: 'Study',
      cards: [],
      sections: [],
    }));
  });

  it('keeps Firestore as the live curriculum repository', () => {
    expect(studyCurriculumRepository).toBe(firestoreCurriculumRepository);
    expect(studyCurriculumRepository).not.toBe(jsonCurriculumRepository);
    expect(TEST_SEASON_ID).toBe('test-season');
    expect(TEST_MATERIAL_SET_ID).toBe('test-material-set');
    expect(TEMPORARY_STUDY_SEASON_ID).toBe('2027');
    expect(TEMPORARY_STUDY_MATERIAL_SET_ID).toBe('beginner-2027');

    const source = readFileSync(
      join(__dirname, '../../src/features/flashcards/screens/FlashcardStudyRoute.tsx'),
      'utf8',
    );
    expect(source).not.toContain('TEMPORARY_STUDY_SEASON_ID');
    expect(source).not.toContain('TEMPORARY_STUDY_MATERIAL_SET_ID');
    expect(source).not.toContain('beginner-2027');
    expect(source).not.toContain("'2027'");
    expect(source).not.toContain('TEST_SEASON_ID');
    expect(source).toContain('studyTarget.seasonId');
    expect(source).toContain('studyTarget.materialSetId');
  });

  it('loads curriculum with the ready competitive Study target', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    const screen = await renderStudy(doubles);

    await waitFor(() => {
      expect(getCurriculum).toHaveBeenCalledTimes(1);
    });
    expect(getCurriculum).toHaveBeenCalledWith(
      SEASON_PARTICIPATION_TEST_SEASON_ID,
      SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID,
    );
    expect(await screen.findByText('No cards available')).toBeTruthy();
  });

  it('loads a Study Track MaterialSet id that differs from competitive Junior', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.participationRepository.getParticipation.mockResolvedValue(
      testStudyTrackParticipation('user-1', '2032', 'material-adult'),
    );
    doubles.materialSetCatalog.listMaterialSets.mockResolvedValue([
      testMaterialSet('2032', 'material-adult', 'experienced', 'Experienced'),
    ]);
    await renderStudy(doubles);

    await waitFor(() => {
      expect(getCurriculum).toHaveBeenCalledTimes(1);
    });
    expect(getCurriculum).toHaveBeenCalledWith('2032', 'material-adult');
    expect(getCurriculum).not.toHaveBeenCalledWith('2032', SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID);
  });

  it('does not load a fallback curriculum when the Season session is not ready', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    doubles.participationRepository.getParticipation.mockResolvedValue(null);
    const screen = await renderStudy(doubles);

    expect(await screen.findByTestId('study-target-unavailable')).toBeTruthy();
    expect(getCurriculum).not.toHaveBeenCalled();
  });

  it('stays closed while Season resolution is loading or failed', async () => {
    const loading = createSeasonParticipationTestDoubles();
    loading.seasonCatalog.listSeasons.mockImplementation(() => new Promise(() => undefined));
    const loadingScreen = await renderStudy(loading);
    expect(await loadingScreen.findByTestId('study-target-unavailable')).toBeTruthy();
    expect(getCurriculum).not.toHaveBeenCalled();

    const failed = createSeasonParticipationTestDoubles();
    failed.seasonCatalog.listSeasons.mockRejectedValue(new Error('offline'));
    const failedScreen = await renderStudy(failed);
    expect(await failedScreen.findByTestId('study-target-unavailable')).toBeTruthy();
    expect(getCurriculum).not.toHaveBeenCalled();
  });
});
