import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import { deriveSeasonSetupSteps } from '../application/deriveSeasonSetupSteps';
import {
  seasonSetupWizardReducer,
  type SeasonSetupWizardAction,
} from '../application/seasonSetupWizard';
import type { DivisionId } from '../domain/division';
import { seasonSetupRouteForStep } from '../navigation/seasonSetupStepRoutes';
import type { SeasonSetupStackParamList } from '../navigation/types';
import { useSeasonSetup } from '../state/SeasonSetupProvider';

export type SeasonSetupAdvanceAction =
  | { type: 'setEligibilityAge'; eligibilityAge: number }
  | { type: 'setFirstYearQuizzer'; isFirstYearQuizzer: boolean }
  | { type: 'setCompetitiveDivision'; divisionId: DivisionId }
  | { type: 'setStudyTrackMaterialSet'; studyTrackMaterialSetId: string }
  | { type: 'setRegion'; regionId: string };

/**
 * Commits an answer through the existing reducer, then follows the derived step.
 */
export function useSeasonSetupAdvance(): (action: SeasonSetupAdvanceAction) => void {
  const navigation = useNavigation<NativeStackNavigationProp<SeasonSetupStackParamList>>();
  const {
    wizard,
    setEligibilityAge,
    setFirstYearQuizzer,
    setCompetitiveDivision,
    setStudyTrackMaterialSet,
    setRegion,
  } = useSeasonSetup();

  return useCallback(
    (action: SeasonSetupAdvanceAction) => {
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
        case 'setRegion':
          setRegion(action.regionId);
          break;
        default: {
          const unexpected: never = action;
          return unexpected;
        }
      }

      const destination = seasonSetupRouteForStep(deriveSeasonSetupSteps(nextState).currentStep);
      if (destination) {
        navigation.navigate(destination);
      }
    },
    [
      wizard,
      navigation,
      setEligibilityAge,
      setFirstYearQuizzer,
      setCompetitiveDivision,
      setStudyTrackMaterialSet,
      setRegion,
    ],
  );
}
