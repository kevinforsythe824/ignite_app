import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { SeasonSetupStackParamList } from '../navigation/types';

/** Pops back to Eligibility Age so the native stack plays the reverse transition. */
export function useSeasonSetupBackToAge(): () => void {
  const navigation =
    useNavigation<NativeStackNavigationProp<SeasonSetupStackParamList>>();

  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);
}
