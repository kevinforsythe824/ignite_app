import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import { deriveSeasonSetupSteps } from '../application/deriveSeasonSetupSteps';
import {
  seasonSetupWizardReducer,
  type SeasonSetupWizardAction,
} from '../application/seasonSetupWizard';
import type { DivisionId } from '../domain/division';
import { useSeasonSetupBoundary } from '../navigation/seasonSetupBoundary';
import { seasonSetupRouteForStep } from '../navigation/seasonSetupStepRoutes';
import type { SeasonSetupStackParamList } from '../navigation/types';
import { useSeasonSetup } from '../state/SeasonSetupProvider';

export type SeasonSetupEarlyAction =
  | { type: 'setEligibilityAge'; eligibilityAge: number }
  | { type: 'setFirstYearQuizzer'; isFirstYearQuizzer: boolean }
  | { type: 'setCompetitiveDivision'; divisionId: DivisionId }
  | { type: 'setStudyTrackMaterialSet'; studyTrackMaterialSetId: string };

/**
 * Commits an early answer through the existing reducer, then follows the derived step.
 * Region is reported to the boundary callback. It is not pushed as a route.
 */
export function useSeasonSetupAdvance(): (action: SeasonSetupEarlyAction) => void {
  const navigation =
    useNavigation<NativeStackNavigationProp<SeasonSetupStackParamList>>();
  const { onReachedRegionBoundary } = useSeasonSetupBoundary();
  const {
    wizard,
    setEligibilityAge,
    setFirstYearQuizzer,
    setCompetitiveDivision,
    setStudyTrackMaterialSet,
  } = useSeasonSetup();

  return useCallback(
    (action: SeasonSetupEarlyAction) => {
      const wizardAction: SeasonSetupWizardAction = action;
      const nextState = seasonSetupWizardReducer(wizard, wizardAction);
      switch (action.type) {
        case 'setEligibilityAge':
          setEligibilityAge(action.eligibilityAge);
          break;
        case 'setFirstYearQuizzer':
          setFirstYearQuizzer(action.isFirstYearQuizzer);
          break;
        case 'setCompetitiveDivision':
          setCompetitiveDivision(action.divisionId);
          break;
        case 'setStudyTrackMaterialSet':
          setStudyTrackMaterialSet(action.studyTrackMaterialSetId);
          break;
        default: {
          const unexpected: never = action;
          return unexpected;
        }
      }

      const destination = seasonSetupRouteForStep(deriveSeasonSetupSteps(nextState).currentStep);
      if (destination === 'region') {
        onReachedRegionBoundary?.({ nextStep: 'region' });
        return;
      }
      if (destination) {
        navigation.navigate(destination);
      }
    },
    [
      wizard,
      navigation,
      onReachedRegionBoundary,
      setEligibilityAge,
      setFirstYearQuizzer,
      setCompetitiveDivision,
      setStudyTrackMaterialSet,
    ],
  );
}
