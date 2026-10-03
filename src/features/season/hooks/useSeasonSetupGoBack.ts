import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback } from 'react';

import type { SeasonSetupStackParamList } from '../navigation/types';

/** Returns to the previous Season Setup screen already on the stack. */
export function useSeasonSetupGoBack(): () => void {
  const navigation = useNavigation<NativeStackNavigationProp<SeasonSetupStackParamList>>();

  return useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);
}
