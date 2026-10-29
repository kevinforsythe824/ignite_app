import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { BottomTabNavigator } from '../../../src/app/navigation/BottomTabNavigator';
import { AuthProvider } from '../../../src/features/auth';
import { firestoreCurriculumRepository } from '../../../src/features/flashcards/repositories';
import type { StudyCurriculum } from '../../../src/features/flashcards/repositories/curriculumRepository';
import type { StudyStackParamList } from '../../../src/features/study/navigation/types';
import { StudyStackNavigator } from '../../../src/features/study/navigation/StudyStackNavigator';
import {
  SeasonParticipationProvider,
  useSeasonParticipation,
} from '../../../src/features/season/state/SeasonParticipationProvider';
import { createAuthRepositoryFake } from '../../../test-utils/authRepositoryFake';
import { officialStudyCard } from '../../../test-utils/officialFlashcardFixtures';
import {
  SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID,
  SEASON_PARTICIPATION_TEST_SEASON_ID,
  createSeasonParticipationTestDoubles,
  testCompetitiveParticipation,
  testMaterialSet,
  testSeason,
  testStudyTrackParticipation,
  type SeasonParticipationTestDoubles,
} from '../../../test-utils/seasonParticipationTestDoubles';

jest.mock('../../../src/features/flashcards/repositories/firebaseCurriculumSource', () => ({
  createFirebaseCurriculumSource: jest.fn(),
  firestoreCurriculumRepository: {
    getCurriculum: jest.fn(),
  },
}));

const getCurriculum = firestoreCurriculumRepository.getCurriculum as jest.Mock;

function readyCurriculum(
  seasonId: string,
  materialSetId: string,
  title: string,
  verses: readonly { cardId: string; verseText: string; reference?: string }[],
): StudyCurriculum {
  const cards = verses.map((verse, index) =>
    officialStudyCard({
      cardId: verse.cardId,
      cardNumber: index + 1,
      seasonId,
      materialSetId,
      sectionId: 'armor',
      reference: verse.reference ?? `Ref ${verse.cardId}`,
      verseText: verse.verseText,
    }),
  );
  return {
    seasonId,
    materialSetId,
    title,
    cards,
    sections: [
      {
        seasonId,
        materialSetId,
        sectionId: 'armor',
        title: 'Armor',
        displayOrder: 1,
        cardIds: cards.map((item) => item.cardId),
      },
    ],
  };
}

interface PendingCurriculum {
  seasonId: string;
  materialSetId: string;
  resolve: (value: StudyCurriculum) => void;
}

function switchInContainer(container: { children: ReadonlyArray<TestInstance | string> }): TestInstance | undefined {
  for (const child of container.children) {
    if (typeof child === 'string') {
      continue;
    }
    const found = switchByLabel(child, 'Shuffle Cards');
    if (found) {
      return found;
    }
  }
  return undefined;
}

function switchByLabel(node: TestInstance | null, label: string): TestInstance | undefined {
  if (!node) {
    return undefined;
  }
  if (node.props?.accessibilityLabel === label && typeof node.props.onChange === 'function') {
    return node;
  }
  for (const child of node.children) {
    if (typeof child === 'string') {
      continue;
    }
    const found = switchByLabel(child, label);
    if (found) {
      return found;
    }
  }
  return undefined;
}

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

async function renderStudy(
  doubles: SeasonParticipationTestDoubles,
  options?: {
    withTabs?: boolean;
    navigationRef?: ReturnType<typeof createNavigationContainerRef<StudyStackParamList>>;
  },
) {
  const auth = createAuthRepositoryFake({
    initialIdentity: { uid: 'user-1', email: 'quizzer@example.com', emailVerified: false },
  });
  const navigation = options?.withTabs ? (
    <NavigationContainer>
      <SeasonRefreshButton />
      <BottomTabNavigator />
    </NavigationContainer>
  ) : (
    <NavigationContainer<StudyStackParamList> ref={options?.navigationRef}>
      <SeasonRefreshButton />
      <StudyStackNavigator />
    </NavigationContainer>
  );
  return render(
    <AuthProvider repository={auth}>
      <SeasonParticipationProvider
        clock={doubles.clock}
        materialSetCatalog={doubles.materialSetCatalog}
        participationRepository={doubles.participationRepository}
        readEnvironment={doubles.readEnvironment}
        seasonCatalog={doubles.seasonCatalog}
      >
        {navigation}
      </SeasonParticipationProvider>
    </AuthProvider>,
  );
}

describe('Annotated scripture list gate', () => {
  beforeEach(() => {
    getCurriculum.mockReset();
    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) =>
      readyCurriculum(seasonId, materialSetId, 'Junior', [
        { cardId: 'gate-card', verseText: 'Gate verse.' },
      ]),
    );
  });

  it('opens the reader from the loaded material without another curriculum request', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    await renderStudy(doubles);

    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    expect(getCurriculum).toHaveBeenCalledTimes(1);
    expect(getCurriculum).toHaveBeenCalledWith(
      SEASON_PARTICIPATION_TEST_SEASON_ID,
      SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID,
    );

    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Gate verse.')).toBeTruthy();
    expect(screen.getAllByText('All Scripture')).toHaveLength(1);
    expect(screen.getByTestId('scripture-material-title').props.children).toBe('Junior');
    expect(screen.queryByLabelText('Mark as correct')).toBeNull();
    expect(getCurriculum).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByLabelText('Back to Study Hub'));
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Gate verse.')).toBeTruthy();
    expect(getCurriculum).toHaveBeenCalledTimes(1);
  });

  it('keeps an in-progress flashcard session when the reader is opened over it', async () => {
    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) =>
      readyCurriculum(seasonId, materialSetId, 'Junior', [
        { cardId: 'first', verseText: 'First session verse.' },
        { cardId: 'second', verseText: 'Second session verse.' },
      ]),
    );
    const doubles = createSeasonParticipationTestDoubles();
    const navigationRef = createNavigationContainerRef<StudyStackParamList>();
    const view = await renderStudy(doubles, { navigationRef });

    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('study-all-material'));
    expect(await screen.findByLabelText('First session verse.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Study settings'));
    await screen.findByText('Shuffle Cards');
    const shuffle = switchInContainer(view.container);
    if (!shuffle) {
      throw new Error('Shuffle switch was not found');
    }
    await act(async () => {
      shuffle.props.onChange({ nativeEvent: { value: true } });
    });
    await waitFor(() => {
      expect(switchInContainer(view.container)?.props.value).toBe(true);
    });
    fireEvent.press(screen.getByLabelText('Dismiss settings'));

    await waitFor(() => {
      expect(navigationRef.isReady()).toBe(true);
    });
    navigationRef.navigate('AnnotatedScriptureList');
    expect(await screen.findByText('All Scripture')).toBeTruthy();
    expect(screen.getByLabelText('First session verse.')).toBeTruthy();
    expect(screen.getByLabelText('Second session verse.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Back to Study Hub'));
    expect(await screen.findByLabelText('First session verse.')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Study settings'));
    await screen.findByText('Shuffle Cards');
    expect(switchInContainer(view.container)?.props.value).toBe(true);
    expect(screen.getByText('1/2', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('0 correct', { includeHiddenElements: true })).toBeTruthy();
    expect(getCurriculum).toHaveBeenCalledTimes(1);
  });

  it('returns to the reader after a bottom-tab switch', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    await renderStudy(doubles, { withTabs: true });

    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Gate verse.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText(/^Home, tab/));
    expect(
      await screen.findByText('Dashboard, recent decks, and tournament preview will live here.'),
    ).toBeTruthy();
    fireEvent.press(screen.getByLabelText(/^Study, tab/));
    expect(await screen.findByLabelText('Gate verse.')).toBeTruthy();
    expect(screen.getByText('All Scripture')).toBeTruthy();
    expect(getCurriculum).toHaveBeenCalledTimes(1);
  });

  it('drops the previous material when the Study target changes while the reader is open', async () => {
    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) =>
      readyCurriculum(
        seasonId,
        materialSetId,
        materialSetId === 'material-adult' ? 'Experienced' : 'Junior',
        [
          {
            cardId: 'target-card',
            verseText: materialSetId === 'material-adult' ? 'Adult verse.' : 'Junior verse.',
          },
        ],
      ),
    );
    const doubles = createSeasonParticipationTestDoubles();
    await renderStudy(doubles);

    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Junior verse.')).toBeTruthy();

    doubles.participationRepository.getParticipation.mockImplementation(
      async (userId: string, seasonId: string) =>
        testStudyTrackParticipation(userId, seasonId, 'material-adult'),
    );
    doubles.materialSetCatalog.listMaterialSets.mockImplementation(async (seasonId: string) => [
      testMaterialSet(seasonId, 'material-adult', 'experienced', 'Experienced'),
    ]);
    fireEvent.press(screen.getByLabelText('Refresh season participation'));

    expect(await screen.findByText('Experienced')).toBeTruthy();
    expect(screen.queryByLabelText('Junior verse.')).toBeNull();
    expect(screen.queryByText('Junior verse.')).toBeNull();
    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Adult verse.')).toBeTruthy();
    expect(screen.queryByLabelText('Junior verse.')).toBeNull();
    expect(getCurriculum).toHaveBeenCalledWith('2032', 'material-adult');
  });

  it('drops the previous season and ignores a stale curriculum result', async () => {
    const pending: PendingCurriculum[] = [];
    getCurriculum.mockImplementation(
      (seasonId: string, materialSetId: string) =>
        new Promise<StudyCurriculum>((resolve) => {
          pending.push({ seasonId, materialSetId, resolve });
        }),
    );
    const doubles = createSeasonParticipationTestDoubles();
    await renderStudy(doubles);

    await waitFor(() => {
      expect(pending).toHaveLength(1);
    });
    await act(async () => {
      pending[0]?.resolve(
        readyCurriculum('2032', SEASON_PARTICIPATION_TEST_MATERIAL_SET_ID, 'Junior', [
          { cardId: 'old', verseText: 'Old season verse.' },
        ]),
      );
    });
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Old season verse.')).toBeTruthy();

    doubles.participationRepository.getParticipation.mockImplementation(
      async (userId: string, seasonId: string) =>
        testStudyTrackParticipation(userId, seasonId, 'material-adult'),
    );
    doubles.materialSetCatalog.listMaterialSets.mockImplementation(async (seasonId: string) => [
      testMaterialSet(seasonId, 'material-adult', 'experienced', 'Experienced'),
    ]);
    fireEvent.press(screen.getByLabelText('Refresh season participation'));
    await waitFor(() => {
      expect(pending.some((call) => call.materialSetId === 'material-adult')).toBe(true);
    });
    expect(screen.queryByLabelText('Old season verse.')).toBeNull();

    doubles.seasonCatalog.listSeasons.mockResolvedValue([
      testSeason({ seasonId: '2033', name: 'Later Season' }),
    ]);
    doubles.participationRepository.getParticipation.mockImplementation(
      async (userId: string, seasonId: string) => {
        if (seasonId !== '2033') {
          return null;
        }
        return testCompetitiveParticipation(userId, seasonId);
      },
    );
    doubles.materialSetCatalog.listMaterialSets.mockImplementation(async (seasonId: string) => [
      testMaterialSet(seasonId, 'material-junior', 'junior', 'Junior Later'),
    ]);
    fireEvent.press(screen.getByLabelText('Refresh season participation'));
    await waitFor(() => {
      expect(pending.some((call) => call.seasonId === '2033')).toBe(true);
    });

    const adult = pending.find((call) => call.materialSetId === 'material-adult');
    await act(async () => {
      adult?.resolve(
        readyCurriculum('2032', 'material-adult', 'Experienced', [
          { cardId: 'adult', verseText: 'Stale adult verse.' },
        ]),
      );
    });
    expect(screen.queryByLabelText('Stale adult verse.')).toBeNull();
    expect(screen.queryByLabelText('Old season verse.')).toBeNull();

    const later = pending.find((call) => call.seasonId === '2033');
    await act(async () => {
      later?.resolve(
        readyCurriculum('2033', 'material-junior', 'Junior Later', [
          { cardId: 'later', verseText: 'Later season verse.' },
        ]),
      );
    });
    expect(await screen.findByText('Junior Later')).toBeTruthy();
    expect(screen.queryByLabelText('Stale adult verse.')).toBeNull();
    expect(screen.queryByLabelText('Old season verse.')).toBeNull();
    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Later season verse.')).toBeTruthy();
  });

  it('hides the reader when participation is unavailable, loading, empty, or failed', async () => {
    const unavailable = createSeasonParticipationTestDoubles();
    unavailable.participationRepository.getParticipation.mockResolvedValue(null);
    const unavailableScreen = await renderStudy(unavailable);
    expect(await unavailableScreen.findByTestId('study-target-unavailable')).toBeTruthy();
    expect(unavailableScreen.queryByText('All Scripture')).toBeNull();
    expect(getCurriculum).not.toHaveBeenCalled();
    await unavailableScreen.unmount();

    const pending: PendingCurriculum[] = [];
    getCurriculum.mockImplementation(
      (seasonId: string, materialSetId: string) =>
        new Promise<StudyCurriculum>((resolve) => {
          pending.push({ seasonId, materialSetId, resolve });
        }),
    );
    const loading = createSeasonParticipationTestDoubles();
    const loadingScreen = await renderStudy(loading);
    expect(await loadingScreen.findByText('Loading cards…')).toBeTruthy();
    expect(loadingScreen.queryByText('All Scripture')).toBeNull();
    expect(loadingScreen.queryByTestId('view-all-material')).toBeNull();
    await loadingScreen.unmount();

    getCurriculum.mockReset();
    getCurriculum.mockRejectedValueOnce(new Error('offline curriculum'));
    const failed = createSeasonParticipationTestDoubles();
    const failedScreen = await renderStudy(failed);
    expect(await failedScreen.findByText('Could not load cards')).toBeTruthy();
    expect(failedScreen.queryByText('All Scripture')).toBeNull();
    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) =>
      readyCurriculum(seasonId, materialSetId, 'Junior', [
        { cardId: 'recovered', verseText: 'Recovered verse.' },
      ]),
    );
    fireEvent.press(failedScreen.getByLabelText('Try again'));
    expect(await failedScreen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(failedScreen.getByTestId('view-all-material'));
    expect(await failedScreen.findByLabelText('Recovered verse.')).toBeTruthy();
    await failedScreen.unmount();

    getCurriculum.mockImplementation(async (seasonId: string, materialSetId: string) => ({
      seasonId,
      materialSetId,
      title: 'Junior',
      cards: [],
      sections: [],
    }));
    const empty = createSeasonParticipationTestDoubles();
    const emptyScreen = await renderStudy(empty);
    expect(await emptyScreen.findByText('No cards available')).toBeTruthy();
    expect(emptyScreen.queryByTestId('view-all-material')).toBeNull();
    expect(emptyScreen.queryByText('All Scripture')).toBeNull();
  });

  it('removes the open reader when participation becomes unavailable', async () => {
    const doubles = createSeasonParticipationTestDoubles();
    await renderStudy(doubles);
    expect(await screen.findByTestId('study-hub')).toBeTruthy();
    fireEvent.press(screen.getByTestId('view-all-material'));
    expect(await screen.findByLabelText('Gate verse.')).toBeTruthy();

    doubles.participationRepository.getParticipation.mockResolvedValue(null);
    fireEvent.press(screen.getByLabelText('Refresh season participation'));
    expect(await screen.findByTestId('study-target-unavailable')).toBeTruthy();
    expect(screen.queryByLabelText('Gate verse.')).toBeNull();
    expect(screen.queryByText('All Scripture')).toBeNull();
  });
});
