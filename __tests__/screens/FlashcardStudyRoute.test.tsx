import { readFileSync } from 'fs';
import { join } from 'path';

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

import { AuthProvider } from '../../src/features/auth';
import type { Card } from '../../src/features/flashcards/domain/card';
import {
  LEGACY_UNIQUE_BEGINNING,
  officialAnnotation,
  officialStudyCard,
} from '../../test-utils/officialFlashcardFixtures';
import {
  TEMPORARY_STUDY_MATERIAL_SET_ID,
  TEMPORARY_STUDY_SEASON_ID,
  TEST_MATERIAL_SET_ID,
  TEST_SEASON_ID,
} from '../../src/features/flashcards/domain/testSeason';
import { firestoreCurriculumRepository } from '../../src/features/flashcards/repositories';
import { jsonCurriculumRepository } from '../../src/features/flashcards/repositories/jsonCurriculumRepository';
import { studyCurriculumRepository } from '../../src/features/flashcards/screens/FlashcardStudyRoute';
import { SeasonParticipationProvider, useSeasonParticipation } from '../../src/features/season/state/SeasonParticipationProvider';
import { StudyStackNavigator } from '../../src/features/study/navigation/StudyStackNavigator';
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

function SeasonRefreshButton(): React.JSX.Element {
  const { refresh } = useSeasonParticipation();
  return (
    <Pressable
      accessibilityLabel="Refresh season participation"
      onPress={() => {
        void refresh();
      }}
    />
  );
}

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
        <NavigationContainer>
          <SeasonRefreshButton />
          <StudyStackNavigator />
        </NavigationContainer>
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
    const gateSource = readFileSync(
      join(__dirname, '../../src/features/study/state/StudyCurriculumGate.tsx'),
      'utf8',
    );
    expect(source).not.toContain('TEMPORARY_STUDY_SEASON_ID');
    expect(source).not.toContain('TEMPORARY_STUDY_MATERIAL_SET_ID');
    expect(source).not.toContain('beginner-2027');
    expect(source).not.toContain("'2027'");
    expect(source).not.toContain('TEST_SEASON_ID');
    expect(source).not.toContain('useFlashcardCurriculum');
    expect(source).toContain('scripturePresentation="official"');
    expect(gateSource).toContain('studyTarget.seasonId');
    expect(gateSource).toContain('studyTarget.materialSetId');
    expect(gateSource).toContain('useFlashcardCurriculum');
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

  it('renders loaded Firestore cards through OfficialScriptureText', async () => {
    const verse = 'Alpha walks.';
    const card: Card = officialStudyCard({
      cardId: 'route-card',
      seasonId: SEASON_PARTICIPATION_TEST_SEASON_ID,
      materialSetId: SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID,
      reference: 'John 11:35',
      verseText: verse,
      matchedRules: [LEGACY_UNIQUE_BEGINNING],
      annotations: [
        officialAnnotation({
          cardId: 'route-card',
          annotationId: 'freq',
          type: 'frequency',
          start: 6,
          end: 11,
          frequencyTier: 2,
        }),
      ],
    });
    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) => ({
      seasonId,
      materialSetId,
      title: 'Junior',
      cards: [card],
      sections: [],
    }));

    const doubles = createSeasonParticipationTestDoubles();
    const screen = await renderStudy(doubles);

    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    expect(screen.getByTestId('study-material-title').props.children).toBe('Junior');
    expect(screen.queryByText(verse)).toBeNull();

    fireEvent.press(screen.getByTestId('study-all-material'));

    expect(await screen.findByTestId('official-scripture-text')).toBeTruthy();
    expect(screen.getByLabelText(verse).props.accessibilityLabel).toBe(verse);
    expect(screen.queryByTestId('rich-verse-text')).toBeNull();
    expect(screen.queryByText('/')).toBeNull();
    expect(screen.getByText('John 11:35')).toBeTruthy();
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

  it('retries a failed curriculum load without leaving the Study gate', async () => {
    getCurriculum.mockRejectedValueOnce(new Error('offline curriculum'));
    const doubles = createSeasonParticipationTestDoubles();
    const screen = await renderStudy(doubles);

    expect(await screen.findByText('Could not load cards')).toBeTruthy();
    expect(screen.getByText('offline curriculum')).toBeTruthy();

    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) => ({
      seasonId,
      materialSetId,
      title: 'Junior',
      cards: [
        officialStudyCard({
          cardId: 'retry-card',
          seasonId,
          materialSetId,
          reference: 'John 11:35',
          verseText: 'Recovered verse.',
        }),
      ],
      sections: [],
    }));

    fireEvent.press(screen.getByLabelText('Try again'));
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    expect(screen.getByTestId('study-material-title').props.children).toBe('Junior');
  });

  it('loads the curriculum once while moving between the hub and flashcards', async () => {
    const verse = 'Alpha walks.';
    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) => ({
      seasonId,
      materialSetId,
      title: 'Junior',
      cards: [
        officialStudyCard({
          cardId: 'once',
          seasonId,
          materialSetId,
          reference: 'John 11:35',
          verseText: verse,
        }),
      ],
      sections: [],
    }));
    const doubles = createSeasonParticipationTestDoubles();
    const screen = await renderStudy(doubles);

    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('study-all-material'));
    expect(await screen.findByLabelText(verse)).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Go back'));
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    expect(getCurriculum).toHaveBeenCalledTimes(1);
  });

  it('drops the previous MaterialSet when the Study target changes', async () => {
    const firstVerse = 'Alpha walks.';
    const secondVerse = 'Beta speaks.';
    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) => ({
      seasonId,
      materialSetId,
      title: materialSetId === 'material-adult' ? 'Experienced' : 'Junior',
      cards: [
        officialStudyCard({
          cardId: 'target-card',
          seasonId,
          materialSetId,
          reference: 'John 11:35',
          verseText: materialSetId === 'material-adult' ? secondVerse : firstVerse,
        }),
      ],
      sections: [],
    }));
    const doubles = createSeasonParticipationTestDoubles();
    const screen = await renderStudy(doubles);

    expect(await screen.findByTestId('study-material-title')).toBeTruthy();
    expect(screen.getByTestId('study-material-title').props.children).toBe('Junior');
    fireEvent.press(screen.getByTestId('study-all-material'));
    expect(await screen.findByLabelText(firstVerse)).toBeTruthy();

    doubles.participationRepository.getParticipation.mockImplementation(
      async (userId: string, seasonId: string) =>
        testStudyTrackParticipation(userId, seasonId, 'material-adult'),
    );
    doubles.materialSetCatalog.listMaterialSets.mockImplementation(async (seasonId: string) => [
      testMaterialSet(seasonId, 'material-adult', 'experienced', 'Experienced'),
    ]);

    fireEvent.press(screen.getByLabelText('Refresh season participation'));

    expect(await screen.findByText('Experienced')).toBeTruthy();
    expect(screen.queryByLabelText(firstVerse)).toBeNull();
    expect(screen.queryByText(firstVerse)).toBeNull();
    fireEvent.press(screen.getByTestId('study-all-material'));
    expect(await screen.findByLabelText(secondVerse)).toBeTruthy();
    expect(getCurriculum).toHaveBeenCalledWith('2032', 'material-adult');
  });
});
