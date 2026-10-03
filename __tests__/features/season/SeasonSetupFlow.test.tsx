import { NavigationContainer } from '@react-navigation/native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { seasonSetupCopy } from '../../../src/features/season/copy/seasonSetupCopy';
import { SeasonSetupFlow } from '../../../src/features/season/composition/SeasonSetupFlow';
import type { SeasonSetupFlowProps } from '../../../src/features/season/composition/SeasonSetupFlow';
import { OFFICIAL_DIVISION_IDS, getDivisionLabel, type DivisionId } from '../../../src/features/season/domain/division';
import { OFFICIAL_REGIONS } from '../../../src/features/season/domain/officialRegions';
import type { ReadyQuizzerSeasonParticipation } from '../../../src/features/season/domain/readyParticipationRecord';
import { SeasonSetupCatalogError } from '../../../src/features/season/errors/seasonSetupCatalogError';
import type { CreateQuizzerSeasonParticipationRequest } from '../../../src/features/season/application/buildCreateParticipationRequest';
import type {
  SeasonSetupCatalog,
  SeasonSetupCatalogRepository,
} from '../../../src/features/season/repositories/seasonSetupCatalogRepository';
import type { QuizzerSeasonParticipationCreator } from '../../../src/features/season/repositories/quizzerSeasonParticipationCreator';

function catalogFor(seasonId: string, divisionIds: readonly DivisionId[] = OFFICIAL_DIVISION_IDS): SeasonSetupCatalog {
  return {
    seasonId,
    regions: OFFICIAL_REGIONS.map((region) => ({
      ...region,
      coverageAreas: [...region.coverageAreas],
    })),
    materialSets: divisionIds.map((divisionId) => ({
      seasonId,
      materialSetId: `opaque-${divisionId}-set`,
      divisionId,
      displayName: getDivisionLabel(divisionId),
    })),
  };
}

function participationFor(
  request: CreateQuizzerSeasonParticipationRequest,
): ReadyQuizzerSeasonParticipation {
  if ('studyTrackMaterialSetId' in request) {
    return {
      quizzerId: 'server-user',
      seasonId: request.seasonId,
      regionId: request.regionId,
      readiness: 'ready',
      participationType: 'studyTrack',
      studyTrackMaterialSetId: request.studyTrackMaterialSetId,
    };
  }
  const divisionId: DivisionId =
    'divisionId' in request
      ? request.divisionId
      : 'isFirstYearQuizzer' in request
        ? request.isFirstYearQuizzer
          ? 'intermediate'
          : 'experienced'
        : 'junior';
  return {
    quizzerId: 'server-user',
    seasonId: request.seasonId,
    regionId: request.regionId,
    readiness: 'ready',
    participationType: 'competitive',
    divisionId,
  };
}

function flowElement(
  props: Partial<SeasonSetupFlowProps> & {
    catalogRepository: SeasonSetupCatalogRepository;
    participationCreator?: QuizzerSeasonParticipationCreator;
  },
): React.JSX.Element {
  return (
    <NavigationContainer>
      <SeasonSetupFlow
        resolvedSeasonId="2032"
        calendarDate="2032-06-01"
        sessionIdentityKey="user-a"
        {...props}
        participationCreator={
          props.participationCreator ?? {
            create: jest.fn(async (request: CreateQuizzerSeasonParticipationRequest) => ({
              created: true,
              participation: participationFor(request),
            })),
          }
        }
      />
    </NavigationContainer>
  );
}

async function renderFlow(
  props: Partial<SeasonSetupFlowProps> & { catalogRepository: SeasonSetupCatalogRepository },
) {
  return render(flowElement(props));
}

async function enterAge(screen: Awaited<ReturnType<typeof renderFlow>>, age: string) {
  await fireEvent.changeText(await screen.findByTestId('season-setup-age-input'), age);
  await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
}

async function chooseRegion(screen: Awaited<ReturnType<typeof renderFlow>>, regionId = 'northwest') {
  await screen.findByTestId('season-setup-region-title');
  await fireEvent.press(screen.getByTestId(`season-setup-choice-${regionId}`));
  await fireEvent.press(screen.getByTestId('season-setup-region-continue'));
  await screen.findByTestId('season-setup-review-title');
}

describe('SeasonSetupFlow catalog loading', () => {
  it('shows a loading state and then the season question', async () => {
    let resolveCatalog: (catalog: SeasonSetupCatalog) => void = () => undefined;
    const catalogRepository = {
      loadCatalog: jest.fn(
        () =>
          new Promise<SeasonSetupCatalog>((resolve) => {
            resolveCatalog = resolve;
          }),
      ),
    };
    const screen = await renderFlow({ catalogRepository });
    expect(await screen.findByTestId('season-setup-loading')).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.loading.title)).toBeTruthy();
    expect(screen.queryByTestId('season-setup-age-input')).toBeNull();
    expect(screen.getByTestId('season-setup-loading').props.accessibilityState).toMatchObject({
      busy: true,
    });

    resolveCatalog(catalogFor('2032'));
    expect(await screen.findByText('How old were you on January 1, 2032?')).toBeTruthy();
    expect(catalogRepository.loadCatalog).toHaveBeenCalledTimes(1);
    expect(catalogRepository.loadCatalog).toHaveBeenCalledWith('2032');
  });

  it('retries a temporary failure and then loads the catalog', async () => {
    const catalogRepository = {
      loadCatalog: jest
        .fn()
        .mockRejectedValueOnce(new SeasonSetupCatalogError('unavailable'))
        .mockResolvedValueOnce(catalogFor('2032')),
    };
    const screen = await renderFlow({ catalogRepository });
    expect(await screen.findByTestId('season-setup-catalog-error')).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.catalog.temporarilyUnavailable)).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('season-setup-catalog-retry'));
    expect(await screen.findByTestId('season-setup-age-input')).toBeTruthy();
    expect(catalogRepository.loadCatalog).toHaveBeenCalledTimes(2);
  });

  it('fails closed without retry when the catalog is invalid', async () => {
    const catalogRepository = {
      loadCatalog: jest.fn().mockRejectedValue(new SeasonSetupCatalogError('invalid-catalog')),
    };
    const screen = await renderFlow({ catalogRepository });
    expect(await screen.findByText(seasonSetupCopy.catalog.unavailable)).toBeTruthy();
    expect(screen.queryByTestId('season-setup-catalog-retry')).toBeNull();
    expect(screen.queryByText(/firestore|invalid-catalog|seasons\//i)).toBeNull();
  });

  it('drops the previous catalog while the next season is loading and ignores a stale result', async () => {
    let resolve2032: (catalog: SeasonSetupCatalog) => void = () => undefined;
    let resolve2033: (catalog: SeasonSetupCatalog) => void = () => undefined;
    const catalogRepository = {
      loadCatalog: jest.fn(
        (seasonId: string) =>
          new Promise<SeasonSetupCatalog>((resolve) => {
            if (seasonId === '2032') {
              resolve2032 = resolve;
            } else {
              resolve2033 = resolve;
            }
          }),
      ),
    };
    const screen = await renderFlow({ catalogRepository });
    resolve2032(catalogFor('2032'));
    expect(await screen.findByText('How old were you on January 1, 2032?')).toBeTruthy();

    await screen.rerender(flowElement({ catalogRepository, resolvedSeasonId: '2033' }));
    expect(await screen.findByTestId('season-setup-loading')).toBeTruthy();
    expect(screen.queryByText('How old were you on January 1, 2032?')).toBeNull();

    resolve2033(catalogFor('2033'));
    expect(await screen.findByText('How old will you be on January 1, 2033?')).toBeTruthy();

    resolve2032(catalogFor('2032'));
    await waitFor(() => {
      expect(screen.getByText('How old will you be on January 1, 2033?')).toBeTruthy();
    });
    expect(screen.queryByText('How old were you on January 1, 2032?')).toBeNull();
  });

  it('clears wizard answers when the session identity changes and reuses the catalog', async () => {
    const catalogRepository = {
      loadCatalog: jest.fn(async () => catalogFor('2032')),
    };
    const screen = await renderFlow({ catalogRepository, sessionIdentityKey: 'user-a' });
    await enterAge(screen, '10');
    await screen.findByTestId('season-setup-region-title');
    await fireEvent.press(screen.getByTestId('season-setup-choice-northwest'));

    await screen.rerender(
      flowElement({ catalogRepository, sessionIdentityKey: 'user-b' }),
    );

    const input = await screen.findByTestId('season-setup-age-input');
    expect(input.props.value).toBe('');
    expect(catalogRepository.loadCatalog).toHaveBeenCalledTimes(1);

    await fireEvent.changeText(input, '10');
    await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
    await screen.findByTestId('season-setup-region-title');
    expect(screen.getByTestId('season-setup-region-continue').props.accessibilityState.disabled).toBe(
      true,
    );
  });
});

describe('SeasonSetupFlow participation', () => {
  async function confirmPath(
    age: string,
    prepare: (screen: Awaited<ReturnType<typeof renderFlow>>) => Promise<void>,
    divisionIds?: readonly DivisionId[],
  ) {
    const onParticipationReady = jest.fn();
    const create = jest.fn(async (request: CreateQuizzerSeasonParticipationRequest) => ({
      created: true,
      participation: participationFor(request),
    }));
    const screen = await renderFlow({
      catalogRepository: { loadCatalog: jest.fn(async () => catalogFor('2032', divisionIds)) },
      participationCreator: { create },
      onParticipationReady,
    });
    await enterAge(screen, age);
    await prepare(screen);
    await chooseRegion(screen);
    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await screen.findByTestId('season-setup-review-complete');
    expect(create).toHaveBeenCalledTimes(1);
    expect(onParticipationReady).toHaveBeenCalledTimes(1);
    return create.mock.calls[0]?.[0] as CreateQuizzerSeasonParticipationRequest;
  }

  it('confirms age 3 through Cadet, region, and review', async () => {
    const request = await confirmPath('3', async (screen) => {
      await fireEvent.press(await screen.findByTestId('season-setup-choice-cadet'));
      await fireEvent.press(screen.getByTestId('season-setup-placement-continue'));
    });
    expect(request).toMatchObject({
      eligibilityAge: 3,
      divisionId: 'cadet',
      regionId: 'northwest',
    });
    expect(request).not.toHaveProperty('uid');
  });

  it('confirms age 10 with a derived junior review and no divisionId', async () => {
    const request = await confirmPath('10', async (screen) => {
      expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    });
    expect(Object.keys(request).sort()).toEqual(['eligibilityAge', 'regionId', 'seasonId']);
  });

  it('confirms age 16 through first year, region, and review', async () => {
    const request = await confirmPath('16', async (screen) => {
      await fireEvent.press(await screen.findByTestId('season-setup-choice-yes'));
      await fireEvent.press(screen.getByTestId('season-setup-first-year-continue'));
    });
    expect(request).toMatchObject({ eligibilityAge: 16, isFirstYearQuizzer: true });
    expect(request).not.toHaveProperty('divisionId');
  });

  it('confirms age 25 through study track without rendering the material set id', async () => {
    const onParticipationReady = jest.fn();
    const create = jest.fn(async (request: CreateQuizzerSeasonParticipationRequest) => ({
      created: true,
      participation: participationFor(request),
    }));
    const screen = await renderFlow({
      catalogRepository: { loadCatalog: jest.fn(async () => catalogFor('2032')) },
      participationCreator: { create },
      onParticipationReady,
    });
    await enterAge(screen, '25');
    await fireEvent.press(await screen.findByTestId('season-setup-choice-opaque-junior-set'));
    await fireEvent.press(screen.getByTestId('season-setup-study-track-continue'));
    await chooseRegion(screen);
    expect(screen.getByText(getDivisionLabel('junior'))).toBeTruthy();
    expect(screen.queryByText('opaque-junior-set')).toBeNull();
    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await screen.findByTestId('season-setup-review-complete');
    const request = create.mock.calls[0]?.[0];
    if (request === undefined || !('studyTrackMaterialSetId' in request)) {
      throw new Error('expected a study track request');
    }
    expect(request.studyTrackMaterialSetId).toBe('opaque-junior-set');
    expect(onParticipationReady).toHaveBeenCalledTimes(1);
  });

  it('fails study track closed when the catalog cannot offer every allowed choice', async () => {
    const screen = await renderFlow({
      catalogRepository: {
        loadCatalog: jest.fn(async () => catalogFor('2032', ['junior'])),
      },
    });
    await enterAge(screen, '25');
    expect(await screen.findByTestId('season-setup-study-track-unavailable')).toBeTruthy();
    expect(
      screen.getByTestId('season-setup-study-track-continue').props.accessibilityState.disabled,
    ).toBe(true);
  });

  it('still lets a competitive quizzer continue when a material set is missing', async () => {
    const screen = await renderFlow({
      catalogRepository: {
        loadCatalog: jest.fn(async () => catalogFor('2032', ['cadet'])),
      },
    });
    await enterAge(screen, '10');
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
  });
});
