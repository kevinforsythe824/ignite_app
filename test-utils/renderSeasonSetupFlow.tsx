import { NavigationContainer } from '@react-navigation/native';
import { render, type RenderResult } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

import { SeasonSetupNavigator } from '../src/features/season/navigation/SeasonSetupNavigator';
import type { SeasonSetupRegionBoundary } from '../src/features/season/navigation/types';
import {
  SeasonSetupProvider,
  useSeasonSetup,
  type SeasonSetupProviderProps,
} from '../src/features/season/state/SeasonSetupProvider';
import type { SeasonSetupStudyTrackOption } from '../src/features/season/utils/resolveStudyTrackChoices';

export const FIXTURE_STUDY_TRACK_OPTIONS: readonly SeasonSetupStudyTrackOption[] = [
  { materialSetId: 'fixture-study-cadet', divisionId: 'cadet' },
  { materialSetId: 'fixture-study-beginner', divisionId: 'beginner' },
  { materialSetId: 'fixture-study-junior', divisionId: 'junior' },
  { materialSetId: 'fixture-study-intermediate', divisionId: 'intermediate' },
  { materialSetId: 'fixture-study-experienced', divisionId: 'experienced' },
];

export function SeasonSetupProbe(): React.JSX.Element {
  const { wizard, steps, placement } = useSeasonSetup();
  const placementDivision = placement.status === 'competitive' ? placement.divisionId : 'none';
  const placementMaterial =
    placement.status === 'studyTrack' ? placement.studyTrackMaterialSetId : 'none';

  return (
    <View>
      <Text testID="probe-age">
        {wizard.eligibilityAge === null ? 'none' : String(wizard.eligibilityAge)}
      </Text>
      <Text testID="probe-division">{wizard.competitiveDivisionId ?? 'none'}</Text>
      <Text testID="probe-first-year">
        {wizard.isFirstYearQuizzer === null ? 'none' : String(wizard.isFirstYearQuizzer)}
      </Text>
      <Text testID="probe-material">{wizard.studyTrackMaterialSetId ?? 'none'}</Text>
      <Text testID="probe-step">{steps.currentStep}</Text>
      <Text testID="probe-placement">{placement.status}</Text>
      <Text testID="probe-placement-division">{placementDivision}</Text>
      <Text testID="probe-placement-material">{placementMaterial}</Text>
      <Text testID="probe-season">{wizard.resolvedSeasonId ?? 'none'}</Text>
    </View>
  );
}

export interface RenderSeasonSetupFlowOptions {
  resolvedSeasonId?: string | null;
  calendarDate?: string;
  sessionIdentityKey?: string | null;
  studyTrackOptions?: SeasonSetupProviderProps['studyTrackOptions'];
  onReachedRegionBoundary?: (boundary: SeasonSetupRegionBoundary) => void;
}

export function seasonSetupFlowElement(
  options: RenderSeasonSetupFlowOptions = {},
  onReachedRegionBoundary: (boundary: SeasonSetupRegionBoundary) => void = () => undefined,
): React.JSX.Element {
  const studyTrackOptions =
    options.studyTrackOptions === undefined
      ? FIXTURE_STUDY_TRACK_OPTIONS
      : options.studyTrackOptions;

  return (
    <SeasonSetupProvider
      resolvedSeasonId={options.resolvedSeasonId === undefined ? '2032' : options.resolvedSeasonId}
      calendarDate={options.calendarDate ?? '2032-06-01'}
      sessionIdentityKey={
        options.sessionIdentityKey === undefined ? 'user-a' : options.sessionIdentityKey
      }
      studyTrackOptions={studyTrackOptions}
    >
      <View>
        <NavigationContainer>
          <SeasonSetupNavigator onReachedRegionBoundary={onReachedRegionBoundary} />
        </NavigationContainer>
        <SeasonSetupProbe />
      </View>
    </SeasonSetupProvider>
  );
}

export async function renderSeasonSetupFlow(
  options: RenderSeasonSetupFlowOptions = {},
): Promise<
  RenderResult & {
    onReachedRegionBoundary: jest.Mock;
  }
> {
  const onReachedRegionBoundary = jest.fn(options.onReachedRegionBoundary);
  const view = await render(seasonSetupFlowElement(options, onReachedRegionBoundary));
  return { ...view, onReachedRegionBoundary };
}
