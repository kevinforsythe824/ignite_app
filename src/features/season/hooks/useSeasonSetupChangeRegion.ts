import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { SeasonSetupStackParamList } from '../navigation/types';

/** Targets Region from Review, including when that screen was skipped. */
export function useSeasonSetupChangeRegion(): () => void {
  const navigation = useNavigation<NativeStackNavigationProp<SeasonSetupStackParamList>>();

  return useCallback(() => {
    navigation.popTo('Region');
  }, [navigation]);
}
