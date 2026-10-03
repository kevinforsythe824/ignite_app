import { CommonActions, useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';

import { useSeasonSetup } from '../state/SeasonSetupProvider';

/**
 * Returns the stack to EligibilityAge when the injected session identity changes.
 * Wizard answers are cleared by SeasonSetupProvider. This only fixes the visible route.
 */
export function useSeasonSetupSessionNavigationReset(): void {
  const navigation = useNavigation();
  const { sessionIdentityKey } = useSeasonSetup();
  const seen = useRef(sessionIdentityKey);

  useEffect(() => {
    if (Object.is(seen.current, sessionIdentityKey)) {
      return;
    }
    seen.current = sessionIdentityKey;
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'EligibilityAge' }],
      }),
    );
  }, [navigation, sessionIdentityKey]);
}
