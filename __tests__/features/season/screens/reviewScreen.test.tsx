import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { getDoc, getDocs, runTransaction } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

import { authCopy } from '../../../../src/features/auth/copy/authCopy';
import type { CreateQuizzerSeasonParticipationRequest } from '../../../../src/features/season/application/buildCreateParticipationRequest';
import { seasonSetupCopy } from '../../../../src/features/season/copy/seasonSetupCopy';
import { getDivisionLabel, type DivisionId } from '../../../../src/features/season/domain/division';
import { OFFICIAL_REGIONS } from '../../../../src/features/season/domain/officialRegions';
import type { ReadyQuizzerSeasonParticipation } from '../../../../src/features/season/domain/readyParticipationRecord';
import { SeasonSetupSubmissionError } from '../../../../src/features/season/errors/seasonSetupSubmissionError';
import type { QuizzerSeasonParticipationCreator } from '../../../../src/features/season/repositories/quizzerSeasonParticipationCreator';
import {
  renderSeasonSetupFlow,
  seasonSetupFlowElement,
  type RenderSeasonSetupFlowOptions,
} from '../../../../test-utils/renderSeasonSetupFlow';

const FORBIDDEN_REQUEST_KEYS = [
  'uid',
  'quizzerId',
  'today',
  'timezone',
  'timeZone',
  'displayName',
  'dateOfBirth',
  'email',
  'dob',
] as const;

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

  let divisionId: DivisionId = 'junior';
  if ('divisionId' in request) {
    divisionId = request.divisionId;
  } else if ('isFirstYearQuizzer' in request) {
    divisionId = request.isFirstYearQuizzer ? 'intermediate' : 'experienced';
  }

  return {
    quizzerId: 'server-user',
    seasonId: request.seasonId,
    regionId: request.regionId,
    readiness: 'ready',
    participationType: 'competitive',
    divisionId,
  };
}

function recordingCreator(): QuizzerSeasonParticipationCreator & {
  create: jest.Mock;
} {
  const create = jest.fn(async (request: CreateQuizzerSeasonParticipationRequest) => ({
    created: true,
    participation: participationFor(request),
  }));
  return { create };
}

async function openAge(options: RenderSeasonSetupFlowOptions = {}) {
  const screen = await renderSeasonSetupFlow(options);
  return screen;
}

async function continueFromAge(
  screen: Awaited<ReturnType<typeof openAge>>,
  age: string,
) {
  await fireEvent.changeText(await screen.findByTestId('season-setup-age-input'), age);
  await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
}

async function chooseRegion(screen: Awaited<ReturnType<typeof openAge>>, regionId = 'northwest') {
  await screen.findByTestId('season-setup-region-title');
  await fireEvent.press(screen.getByTestId(`season-setup-choice-${regionId}`));
  await fireEvent.press(screen.getByTestId('season-setup-region-continue'));
  await screen.findByTestId('season-setup-review-title');
}

function reviewText(screen: Awaited<ReturnType<typeof openAge>>): string {
  return [
    screen.getByTestId('season-setup-review-season').props.accessibilityLabel,
    screen.getByTestId('season-setup-review-material').props.accessibilityLabel,
    screen.getByTestId('season-setup-review-region').props.accessibilityLabel,
  ].join(' ');
}

function expectNoSensitiveReviewText(screen: Awaited<ReturnType<typeof openAge>>, age: string) {
  const summary = reviewText(screen);
  expect(summary).not.toMatch(new RegExp(`\\b${age}\\b`));
  expect(summary).not.toContain(seasonSetupCopy.firstYear.question);
  expect(summary).not.toMatch(/\bYes\b/);
  expect(summary).not.toMatch(/\bNo\b/);
  expect(summary).not.toMatch(/date of birth/i);
  expect(summary).not.toMatch(/\bnorthwest\b/);
  expect(summary).not.toContain('fixture-study-');
}

describe('ReviewScreen', () => {
  it('shows season, derived junior, and the selected region for age 10', async () => {
    const screen = await openAge();
    await continueFromAge(screen, '10');
    await chooseRegion(screen);

    expect(screen.getByRole('header', { name: seasonSetupCopy.review.title })).toBeTruthy();
    expect(screen.getByTestId('season-setup-review-season').props.accessibilityLabel).toBe(
      'Season, 2032 Season',
    );
    expect(screen.getByText(getDivisionLabel('junior'))).toBeTruthy();
    expect(screen.getByText('Northwest')).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.review.division)).toBeTruthy();
    expect(screen.queryByText(seasonSetupCopy.review.studyMaterial)).toBeNull();
    expectNoSensitiveReviewText(screen, '10');
    expect(screen.getByTestId('probe-division').props.children).toBe('none');
  });

  it('shows the domain-derived division for a first-year yes and no', async () => {
    const yes = await openAge();
    await continueFromAge(yes, '16');
    await fireEvent.press(await yes.findByTestId('season-setup-choice-yes'));
    await fireEvent.press(yes.getByTestId('season-setup-first-year-continue'));
    await chooseRegion(yes);
    expect(yes.getByText(getDivisionLabel('intermediate'))).toBeTruthy();
    expectNoSensitiveReviewText(yes, '16');

    const no = await openAge();
    await continueFromAge(no, '16');
    await fireEvent.press(await no.findByTestId('season-setup-choice-no'));
    await fireEvent.press(no.getByTestId('season-setup-first-year-continue'));
    await chooseRegion(no);
    expect(no.getByTestId('season-setup-review-material').props.accessibilityLabel).toBe(
      `${seasonSetupCopy.review.division}, ${getDivisionLabel('experienced')}`,
    );
    expectNoSensitiveReviewText(no, '16');
  });

  it('shows the chosen Cadet or Beginner division for age 3', async () => {
    const cadet = await openAge();
    await continueFromAge(cadet, '3');
    await fireEvent.press(await cadet.findByTestId('season-setup-choice-cadet'));
    await fireEvent.press(cadet.getByTestId('season-setup-placement-continue'));
    await chooseRegion(cadet);
    expect(cadet.getByText(getDivisionLabel('cadet'))).toBeTruthy();
    expectNoSensitiveReviewText(cadet, '3');

    const beginner = await openAge();
    await continueFromAge(beginner, '3');
    await fireEvent.press(await beginner.findByTestId('season-setup-choice-beginner'));
    await fireEvent.press(beginner.getByTestId('season-setup-placement-continue'));
    await chooseRegion(beginner);
    expect(beginner.getByTestId('season-setup-review-material').props.accessibilityLabel).toBe(
      `${seasonSetupCopy.review.division}, ${getDivisionLabel('beginner')}`,
    );
  });

  it('shows the study track label and keeps the material set id internal', async () => {
    const creator = recordingCreator();
    const screen = await openAge({ participationCreator: creator });
    await continueFromAge(screen, '25');
    await fireEvent.press(await screen.findByTestId('season-setup-choice-fixture-study-junior'));
    await fireEvent.press(screen.getByTestId('season-setup-study-track-continue'));
    await chooseRegion(screen);

    expect(screen.getByTestId('season-setup-review-material').props.accessibilityLabel).toBe(
      `${seasonSetupCopy.review.studyMaterial}, ${getDivisionLabel('junior')}`,
    );
    expect(screen.getByText('Northwest')).toBeTruthy();
    expectNoSensitiveReviewText(screen, '25');

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(creator.create).toHaveBeenCalledTimes(1));
    expect(creator.create.mock.calls[0]?.[0]).toMatchObject({
      seasonId: '2032',
      eligibilityAge: 25,
      regionId: 'northwest',
      studyTrackMaterialSetId: 'fixture-study-junior',
    });
    expect(creator.create.mock.calls[0]?.[0]).not.toHaveProperty('divisionId');
  });

  it('fails closed when the selected region is no longer active', async () => {
    const screen = await openAge();
    await continueFromAge(screen, '10');
    await chooseRegion(screen);

    await screen.rerender(
      seasonSetupFlowElement({
        regions: OFFICIAL_REGIONS.map((region) =>
          region.regionId === 'northwest' ? { ...region, active: false } : region,
        ),
      }),
    );

    expect(await screen.findByTestId('season-setup-review-unavailable')).toBeTruthy();
    expect(screen.getByTestId('season-setup-review-confirm').props.accessibilityState.disabled).toBe(
      true,
    );
    expect(screen.queryByText('Northwest')).toBeNull();
  });
});

describe('Review change region', () => {
  function callCount(fn: unknown): number {
    return (fn as jest.Mock).mock.calls.length;
  }

  it('returns to the selected region and confirms a newly chosen region id', async () => {
    const creator = recordingCreator();
    const screen = await openAge({ participationCreator: creator });
    await continueFromAge(screen, '10');
    await chooseRegion(screen, 'southwest');

    const regionSummary = screen.getByTestId('season-setup-review-region');
    expect(regionSummary.props.accessibilityLabel).toBe('Region, Southwest');
    expect(within(regionSummary).getByText('Southwest')).toBeTruthy();
    expect(screen.getByText(seasonSetupCopy.review.change)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: seasonSetupCopy.review.changeRegion })).toHaveLength(
      1,
    );
    expect(screen.getByLabelText(authCopy.actions.back)).toBeTruthy();
    expect(screen.queryByLabelText('Change season')).toBeNull();
    expect(screen.queryByLabelText('Change division')).toBeNull();
    expect(screen.getByTestId('season-setup-review-confirm')).toBeTruthy();

    const firestoreBefore = {
      getDoc: callCount(getDoc),
      getDocs: callCount(getDocs),
      runTransaction: callCount(runTransaction),
      httpsCallable: callCount(httpsCallable),
    };

    await fireEvent.press(screen.getByTestId('season-setup-review-change-region'));
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-review-title')).toBeNull();
    expect(screen.getByTestId('probe-region').props.children).toBe('southwest');
    expect(
      screen.getByTestId('season-setup-choice-southwest').props.accessibilityState.selected,
    ).toBe(true);
    expect(creator.create).not.toHaveBeenCalled();
    expect(screen.getByTestId('probe-submission').props.children).toBe('idle');

    await fireEvent.press(screen.getByTestId('season-setup-choice-northeast'));
    expect(screen.getByTestId('probe-region').props.children).toBe('northeast');
    await fireEvent.press(screen.getByTestId('season-setup-region-continue'));
    await screen.findByTestId('season-setup-review-title');

    const updatedRegion = screen.getByTestId('season-setup-review-region');
    expect(updatedRegion.props.accessibilityLabel).toBe('Region, Northeast');
    expect(within(updatedRegion).getByText('Northeast')).toBeTruthy();
    expect(within(updatedRegion).queryByText('Southwest')).toBeNull();
    expect(screen.getByText(getDivisionLabel('junior'))).toBeTruthy();
    expect(screen.getByTestId('probe-placement-division').props.children).toBe('junior');
    expect(screen.getByTestId('probe-division').props.children).toBe('none');
    expect(creator.create).not.toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalledTimes(firestoreBefore.getDoc);
    expect(getDocs).toHaveBeenCalledTimes(firestoreBefore.getDocs);
    expect(runTransaction).toHaveBeenCalledTimes(firestoreBefore.runTransaction);
    expect(httpsCallable).toHaveBeenCalledTimes(firestoreBefore.httpsCallable);
    expect(screen.getByTestId('probe-submission').props.children).toBe('idle');
    expect(screen.getByLabelText(authCopy.actions.back)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(creator.create).toHaveBeenCalledTimes(1));
    expect(creator.create.mock.calls[0]?.[0].regionId).toBe('northeast');
    expect(creator.create.mock.calls[0]?.[0]).not.toMatchObject({ regionId: 'southwest' });
  });

  it('keeps the current region when Change returns and Continue is pressed again', async () => {
    const screen = await openAge();
    await continueFromAge(screen, '10');
    await chooseRegion(screen, 'southwest');

    expect(screen.getByLabelText(authCopy.actions.back)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(seasonSetupCopy.review.changeRegion));
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(
      screen.getByTestId('season-setup-choice-southwest').props.accessibilityState.selected,
    ).toBe(true);

    await fireEvent.press(screen.getByTestId('season-setup-region-continue'));
    await screen.findByTestId('season-setup-review-title');
    expect(screen.getByTestId('season-setup-review-region').props.accessibilityLabel).toBe(
      'Region, Southwest',
    );
    expect(screen.getByTestId('probe-region').props.children).toBe('southwest');

    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(
      screen.getByTestId('season-setup-choice-southwest').props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.queryByTestId('season-setup-review-title')).toBeNull();
  });

  it('hides Change region while submitting and after completion', async () => {
    let resolveCreate: (value: {
      created: boolean;
      participation: ReadyQuizzerSeasonParticipation;
    }) => void = () => undefined;
    const create = jest.fn(
      (request: CreateQuizzerSeasonParticipationRequest) =>
        new Promise<{ created: boolean; participation: ReadyQuizzerSeasonParticipation }>(
          (resolve) => {
            resolveCreate = resolve;
          },
        ),
    );
    const screen = await openAge({ participationCreator: { create } });
    await continueFromAge(screen, '10');
    await chooseRegion(screen, 'southwest');

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    expect(screen.getByTestId('probe-submission').props.children).toBe('submitting');
    expect(screen.queryByTestId('season-setup-review-change-region')).toBeNull();
    expect(screen.queryByLabelText(seasonSetupCopy.review.changeRegion)).toBeNull();
    expect(screen.queryByLabelText(authCopy.actions.back)).toBeNull();
    expect(screen.getByTestId('season-setup-review-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-region-title')).toBeNull();
    expect(screen.getByTestId('probe-region').props.children).toBe('southwest');

    const submitted = create.mock.calls[0]?.[0];
    if (submitted === undefined) {
      throw new Error('expected a participation request');
    }
    resolveCreate({ created: true, participation: participationFor(submitted) });
    expect(await screen.findByTestId('season-setup-review-complete')).toBeTruthy();
    expect(screen.getByTestId('probe-submission').props.children).toBe('complete');
    expect(screen.queryByTestId('season-setup-review-change-region')).toBeNull();
    expect(screen.queryByLabelText(seasonSetupCopy.review.changeRegion)).toBeNull();
    expect(screen.queryByLabelText(authCopy.actions.back)).toBeNull();
    expect(screen.getByTestId('season-setup-review-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-region-title')).toBeNull();
    expect(screen.getByTestId('probe-region').props.children).toBe('southwest');
    expect(create).toHaveBeenCalledTimes(1);
  });

  async function selectRegionThenReturnToAge(
    screen: Awaited<ReturnType<typeof openAge>>,
    regionId: string,
  ) {
    await continueFromAge(screen, '10');
    await chooseRegion(screen, regionId);
    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    await screen.findByTestId('season-setup-region-title');
    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    await screen.findByTestId('season-setup-age-input');
  }

  async function reviewWithRegionAlreadyChosen(
    screen: Awaited<ReturnType<typeof openAge>>,
    age: string,
    answer: (view: Awaited<ReturnType<typeof openAge>>) => Promise<void>,
  ) {
    await fireEvent.changeText(screen.getByTestId('season-setup-age-input'), age);
    await fireEvent.press(screen.getByTestId('season-setup-age-continue'));
    await answer(screen);
    await screen.findByTestId('season-setup-review-title');
    expect(screen.queryByTestId('season-setup-region-title')).toBeNull();
  }

  async function changeToNortheast(
    screen: Awaited<ReturnType<typeof openAge>>,
    skippedTitleTestId: string,
  ) {
    await fireEvent.press(screen.getByTestId('season-setup-review-change-region'));
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-review-title')).toBeNull();
    expect(screen.queryByTestId(skippedTitleTestId)).toBeNull();
    expect(screen.getByTestId('probe-region').props.children).toBe('southwest');
    expect(
      screen.getByTestId('season-setup-choice-southwest').props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.getByTestId('probe-submission').props.children).toBe('idle');

    await fireEvent.press(screen.getByTestId('season-setup-choice-northeast'));
    await fireEvent.press(screen.getByTestId('season-setup-region-continue'));
    await screen.findByTestId('season-setup-review-title');
  }

  it('opens Region from a skipped Cadet path and confirms the new region id', async () => {
    const creator = recordingCreator();
    const screen = await openAge({ participationCreator: creator });
    await selectRegionThenReturnToAge(screen, 'southwest');
    await reviewWithRegionAlreadyChosen(screen, '2', async (view) => {
      await fireEvent.press(await view.findByTestId('season-setup-choice-cadet'));
      await fireEvent.press(view.getByTestId('season-setup-placement-continue'));
    });

    expect(screen.getByTestId('season-setup-review-region').props.accessibilityLabel).toBe(
      'Region, Southwest',
    );
    expect(screen.getByText(getDivisionLabel('cadet'))).toBeTruthy();
    expect(screen.getByTestId('probe-division').props.children).toBe('cadet');

    const firestoreBefore = {
      getDoc: callCount(getDoc),
      getDocs: callCount(getDocs),
      runTransaction: callCount(runTransaction),
      httpsCallable: callCount(httpsCallable),
    };

    await changeToNortheast(screen, 'season-setup-placement-title');
    expect(screen.getByTestId('season-setup-review-region').props.accessibilityLabel).toBe(
      'Region, Northeast',
    );
    expect(screen.getByText(getDivisionLabel('cadet'))).toBeTruthy();
    expect(screen.getByTestId('probe-division').props.children).toBe('cadet');
    expect(creator.create).not.toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalledTimes(firestoreBefore.getDoc);
    expect(getDocs).toHaveBeenCalledTimes(firestoreBefore.getDocs);
    expect(runTransaction).toHaveBeenCalledTimes(firestoreBefore.runTransaction);
    expect(httpsCallable).toHaveBeenCalledTimes(firestoreBefore.httpsCallable);
    expect(screen.getByTestId('probe-submission').props.children).toBe('idle');

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(creator.create).toHaveBeenCalledTimes(1));
    expect(creator.create.mock.calls[0]?.[0]).toEqual({
      seasonId: '2032',
      eligibilityAge: 2,
      regionId: 'northeast',
      divisionId: 'cadet',
    });
  });

  it('opens Region from a skipped First-Year path and keeps the first-year answer', async () => {
    const creator = recordingCreator();
    const screen = await openAge({ participationCreator: creator });
    await selectRegionThenReturnToAge(screen, 'southwest');
    await reviewWithRegionAlreadyChosen(screen, '16', async (view) => {
      await fireEvent.press(await view.findByTestId('season-setup-choice-yes'));
      await fireEvent.press(view.getByTestId('season-setup-first-year-continue'));
    });

    expect(screen.queryByTestId('season-setup-first-year-title')).toBeNull();
    expect(screen.getByTestId('probe-first-year').props.children).toBe('true');
    expect(screen.getByText(getDivisionLabel('intermediate'))).toBeTruthy();

    await changeToNortheast(screen, 'season-setup-first-year-title');
    expect(screen.getByTestId('probe-first-year').props.children).toBe('true');
    expect(screen.getByText(getDivisionLabel('intermediate'))).toBeTruthy();
    expect(screen.getByTestId('season-setup-review-region').props.accessibilityLabel).toBe(
      'Region, Northeast',
    );
    expect(creator.create).not.toHaveBeenCalled();
    expect(screen.getByTestId('probe-submission').props.children).toBe('idle');

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(creator.create).toHaveBeenCalledTimes(1));
    expect(creator.create.mock.calls[0]?.[0]).toEqual({
      seasonId: '2032',
      eligibilityAge: 16,
      regionId: 'northeast',
      isFirstYearQuizzer: true,
    });
  });

  it('opens Region from a skipped Study Track path and keeps the study material', async () => {
    const creator = recordingCreator();
    const screen = await openAge({ participationCreator: creator });
    await selectRegionThenReturnToAge(screen, 'southwest');
    await reviewWithRegionAlreadyChosen(screen, '25', async (view) => {
      await fireEvent.press(await view.findByTestId('season-setup-choice-fixture-study-junior'));
      await fireEvent.press(view.getByTestId('season-setup-study-track-continue'));
    });

    expect(screen.queryByTestId('season-setup-study-track-title')).toBeNull();
    expect(screen.getByTestId('probe-material').props.children).toBe('fixture-study-junior');
    expect(screen.getByTestId('season-setup-review-material').props.accessibilityLabel).toBe(
      `${seasonSetupCopy.review.studyMaterial}, ${getDivisionLabel('junior')}`,
    );

    await changeToNortheast(screen, 'season-setup-study-track-title');
    expect(screen.getByTestId('probe-material').props.children).toBe('fixture-study-junior');
    expect(screen.getByTestId('season-setup-review-material').props.accessibilityLabel).toBe(
      `${seasonSetupCopy.review.studyMaterial}, ${getDivisionLabel('junior')}`,
    );
    expect(screen.getByTestId('season-setup-review-region').props.accessibilityLabel).toBe(
      'Region, Northeast',
    );
    expect(creator.create).not.toHaveBeenCalled();
    expect(screen.getByTestId('probe-submission').props.children).toBe('idle');

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(creator.create).toHaveBeenCalledTimes(1));
    expect(creator.create.mock.calls[0]?.[0]).toEqual({
      seasonId: '2032',
      eligibilityAge: 25,
      regionId: 'northeast',
      studyTrackMaterialSetId: 'fixture-study-junior',
    });
  });

  it('keeps Review header Back on the previous screen while Change opens Region', async () => {
    const screen = await openAge();
    await selectRegionThenReturnToAge(screen, 'southwest');
    await reviewWithRegionAlreadyChosen(screen, '2', async (view) => {
      await fireEvent.press(await view.findByTestId('season-setup-choice-cadet'));
      await fireEvent.press(view.getByTestId('season-setup-placement-continue'));
    });

    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    expect(await screen.findByTestId('season-setup-placement-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-region-title')).toBeNull();
    expect(screen.queryByTestId('season-setup-review-title')).toBeNull();
    expect(screen.getByTestId('probe-division').props.children).toBe('cadet');

    await fireEvent.press(screen.getByTestId('season-setup-placement-continue'));
    await screen.findByTestId('season-setup-review-title');

    await fireEvent.press(screen.getByTestId('season-setup-review-change-region'));
    expect(await screen.findByTestId('season-setup-region-title')).toBeTruthy();
    expect(screen.queryByTestId('season-setup-placement-title')).toBeNull();
    expect(screen.queryByTestId('season-setup-review-title')).toBeNull();
    expect(
      screen.getByTestId('season-setup-choice-southwest').props.accessibilityState.selected,
    ).toBe(true);
    expect(screen.getByTestId('probe-division').props.children).toBe('cadet');
    expect(screen.getByTestId('probe-region').props.children).toBe('southwest');
  });
});

describe('Review submission', () => {
  async function reviewForAge(
    age: string,
    options: RenderSeasonSetupFlowOptions,
    prepare?: (screen: Awaited<ReturnType<typeof openAge>>) => Promise<void>,
  ) {
    const screen = await openAge(options);
    await continueFromAge(screen, age);
    if (prepare) {
      await prepare(screen);
    }
    await chooseRegion(screen);
    return screen;
  }

  function assertRequestShape(request: CreateQuizzerSeasonParticipationRequest) {
    for (const key of FORBIDDEN_REQUEST_KEYS) {
      expect(request).not.toHaveProperty(key);
    }
  }

  it('sends a chosen division for ages 2–4 and omits divisionId for a single competitive option', async () => {
    const chosen = recordingCreator();
    const age3 = await reviewForAge('3', { participationCreator: chosen }, async (screen) => {
      await fireEvent.press(await screen.findByTestId('season-setup-choice-cadet'));
      await fireEvent.press(screen.getByTestId('season-setup-placement-continue'));
    });
    await fireEvent.press(age3.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(chosen.create).toHaveBeenCalledTimes(1));
    const age3Request = chosen.create.mock.calls[0]?.[0] as CreateQuizzerSeasonParticipationRequest;
    expect(age3Request).toEqual({
      seasonId: '2032',
      eligibilityAge: 3,
      regionId: 'northwest',
      divisionId: 'cadet',
    });
    assertRequestShape(age3Request);

    const single = recordingCreator();
    const age10 = await reviewForAge('10', { participationCreator: single });
    await fireEvent.press(age10.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(single.create).toHaveBeenCalledTimes(1));
    const age10Request = single.create.mock.calls[0]?.[0] as CreateQuizzerSeasonParticipationRequest;
    expect(Object.keys(age10Request).sort()).toEqual(['eligibilityAge', 'regionId', 'seasonId']);
    expect(age10Request).not.toHaveProperty('divisionId');
    assertRequestShape(age10Request);
  });

  it('sends isFirstYearQuizzer for ages 15–18', async () => {
    const creator = recordingCreator();
    const screen = await reviewForAge('16', { participationCreator: creator }, async (view) => {
      await fireEvent.press(await view.findByTestId('season-setup-choice-no'));
      await fireEvent.press(view.getByTestId('season-setup-first-year-continue'));
    });
    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(creator.create).toHaveBeenCalledTimes(1));
    const request = creator.create.mock.calls[0]?.[0] as CreateQuizzerSeasonParticipationRequest;
    expect(request).toEqual({
      seasonId: '2032',
      eligibilityAge: 16,
      regionId: 'northwest',
      isFirstYearQuizzer: false,
    });
    expect(request).not.toHaveProperty('divisionId');
    assertRequestShape(request);
  });

  it('completes from one server success and ignores a second confirm press', async () => {
    let resolveCreate: (value: {
      created: boolean;
      participation: ReadyQuizzerSeasonParticipation;
    }) => void = () => undefined;
    const create = jest.fn(
      (_request: CreateQuizzerSeasonParticipationRequest) =>
        new Promise<{ created: boolean; participation: ReadyQuizzerSeasonParticipation }>(
          (resolve) => {
            resolveCreate = resolve;
          },
        ),
    );
    const onParticipationReady = jest.fn();
    const screen = await reviewForAge('10', {
      participationCreator: { create },
      onParticipationReady,
    });

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('probe-submission').props.children).toBe('submitting');
    expect(screen.getByTestId('season-setup-review-confirm').props.accessibilityState).toMatchObject({
      busy: true,
      disabled: true,
    });
    expect(screen.queryByLabelText(authCopy.actions.back)).toBeNull();

    const submitted = create.mock.calls[0]?.[0];
    if (submitted === undefined) {
      throw new Error('expected a participation request');
    }
    const participation = participationFor(submitted);
    resolveCreate({ created: true, participation });
    expect(await screen.findByTestId('season-setup-review-complete')).toBeTruthy();
    expect(screen.getByTestId('probe-submission').props.children).toBe('complete');
    expect(onParticipationReady).toHaveBeenCalledTimes(1);
    expect(onParticipationReady).toHaveBeenCalledWith(participation, true);
    expect(screen.getByTestId('season-setup-review-confirm').props.accessibilityState.disabled).toBe(
      true,
    );
  });

  it('stays retryable after a server failure and rebuilds the request after an edit', async () => {
    const firstParticipation = {
      quizzerId: 'server-user',
      seasonId: '2032',
      regionId: 'southwest',
      readiness: 'ready' as const,
      participationType: 'competitive' as const,
      divisionId: 'junior' as const,
    };
    const create = jest
      .fn()
      .mockRejectedValueOnce(new SeasonSetupSubmissionError('unavailable'))
      .mockResolvedValueOnce({ created: true, participation: firstParticipation });
    const onParticipationReady = jest.fn();
    const screen = await reviewForAge('10', {
      participationCreator: { create },
      onParticipationReady,
    });

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    expect(await screen.findByTestId('season-setup-review-error')).toBeTruthy();
    expect(screen.getByRole('alert').props.children).toBe(
      new SeasonSetupSubmissionError('unavailable').message,
    );
    expect(screen.getByTestId('probe-submission').props.children).toBe('failed');
    expect(onParticipationReady).not.toHaveBeenCalled();
    expect(screen.getByTestId('season-setup-review-confirm').props.accessibilityState.disabled).toBe(
      false,
    );
    expect(screen.getByTestId('probe-region').props.children).toBe('northwest');

    await fireEvent.press(screen.getByLabelText(authCopy.actions.back));
    await screen.findByTestId('season-setup-region-title');
    await fireEvent.press(screen.getByTestId('season-setup-choice-southwest'));
    await fireEvent.press(screen.getByTestId('season-setup-region-continue'));
    await screen.findByTestId('season-setup-review-title');
    expect(screen.queryByTestId('season-setup-review-error')).toBeNull();

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await screen.findByTestId('season-setup-review-complete');
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0]?.[0].regionId).toBe('northwest');
    expect(create.mock.calls[1]?.[0].regionId).toBe('southwest');
    expect(create.mock.calls[1]?.[0]).not.toBe(create.mock.calls[0]?.[0]);
    expect(onParticipationReady).toHaveBeenCalledTimes(1);
  });

  it('stays complete when the completion callback throws after server success', async () => {
    const create = jest.fn(async (request: CreateQuizzerSeasonParticipationRequest) => ({
      created: true,
      participation: participationFor(request),
    }));
    const onParticipationReady = jest.fn(() => {
      throw new Error('handoff failed');
    });
    const screen = await reviewForAge('10', {
      participationCreator: { create },
      onParticipationReady,
    });

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(onParticipationReady).toHaveBeenCalledTimes(1));

    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('probe-submission').props.children).toBe('complete');
    expect(screen.queryByTestId('season-setup-review-error')).toBeNull();
    expect(screen.getByTestId('season-setup-review-complete')).toBeTruthy();
    expect(screen.getByTestId('season-setup-review-confirm').props.accessibilityState.disabled).toBe(
      true,
    );

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    expect(create).toHaveBeenCalledTimes(1);
    expect(onParticipationReady).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('probe-submission').props.children).toBe('complete');
  });

  it('stays complete when the completion callback throws after an existing participation', async () => {
    const existing: ReadyQuizzerSeasonParticipation = {
      quizzerId: 'server-user',
      seasonId: '2032',
      regionId: 'northwest',
      readiness: 'ready',
      participationType: 'competitive',
      divisionId: 'junior',
    };
    const create = jest.fn(async () => ({ created: false, participation: existing }));
    const onParticipationReady = jest.fn(() => {
      throw new Error('handoff failed');
    });
    const screen = await reviewForAge('10', {
      participationCreator: { create },
      onParticipationReady,
    });

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    await waitFor(() => expect(onParticipationReady).toHaveBeenCalledTimes(1));

    expect(create).toHaveBeenCalledTimes(1);
    expect(onParticipationReady).toHaveBeenCalledWith(existing, false);
    expect(screen.getByTestId('probe-submission').props.children).toBe('complete');
    expect(screen.queryByTestId('season-setup-review-error')).toBeNull();
    expect(screen.getByTestId('season-setup-review-confirm').props.accessibilityState.disabled).toBe(
      true,
    );

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    expect(create).toHaveBeenCalledTimes(1);
    expect(onParticipationReady).toHaveBeenCalledTimes(1);
  });

  it('stays complete when the completion callback rejects after server success', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);

    const participation: ReadyQuizzerSeasonParticipation = {
      quizzerId: 'server-user',
      seasonId: '2032',
      regionId: 'northwest',
      readiness: 'ready',
      participationType: 'competitive',
      divisionId: 'junior',
    };
    const create = jest.fn(async () => ({ created: true, participation }));
    let rejectHandoff: (error: Error) => void = () => undefined;
    const onParticipationReady = jest.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectHandoff = reject;
        }),
    );

    try {
      const screen = await reviewForAge('10', {
        participationCreator: { create },
        onParticipationReady,
      });

      await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
      expect(await screen.findByTestId('season-setup-review-complete')).toBeTruthy();
      expect(onParticipationReady).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('probe-submission').props.children).toBe('complete');

      await act(async () => {
        rejectHandoff(new Error('handoff rejected'));
        await Promise.resolve();
      });
      await act(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 0);
        });
      });

      expect(unhandled).toEqual([]);
      expect(screen.getByTestId('probe-submission').props.children).toBe('complete');
      expect(screen.queryByTestId('season-setup-review-error')).toBeNull();
      expect(create).toHaveBeenCalledTimes(1);
      expect(onParticipationReady).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('treats an existing participation as successful completion', async () => {
    const existing: ReadyQuizzerSeasonParticipation = {
      quizzerId: 'server-user',
      seasonId: '2032',
      regionId: 'central',
      readiness: 'ready',
      participationType: 'competitive',
      divisionId: 'experienced',
    };
    const onParticipationReady = jest.fn();
    const screen = await reviewForAge('10', {
      participationCreator: {
        create: jest.fn(async () => ({ created: false, participation: existing })),
      },
      onParticipationReady,
    });

    await fireEvent.press(screen.getByTestId('season-setup-review-confirm'));
    expect(await screen.findByTestId('season-setup-review-complete')).toBeTruthy();
    expect(screen.getByTestId('probe-submission').props.children).toBe('complete');
    expect(onParticipationReady).toHaveBeenCalledWith(existing, false);
    expect(screen.queryByTestId('season-setup-review-error')).toBeNull();
  });
});
