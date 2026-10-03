import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { SeasonSetupStackParamList } from '../navigation/types';

export function useSeasonSetupBackToAge(): () => void {
  const navigation =
    useNavigation<NativeStackNavigationProp<SeasonSetupStackParamList>>();

  return useCallback(() => {
    navigation.navigate('EligibilityAge');
  }, [navigation]);
}
